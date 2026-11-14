using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;

namespace API.Middleware;

public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private static readonly ConcurrentDictionary<string, ClientRequestInfo> _clients = new();
    private static readonly ConcurrentDictionary<string, SuspiciousActivity> _suspiciousClients = new();
    
    private readonly RateLimitOptions _options;

    public RateLimitingMiddleware(RequestDelegate next, ILogger<RateLimitingMiddleware> logger, 
        RateLimitOptions? options = null)
    {
        _next = next;
        _logger = logger;
        _options = options ?? new RateLimitOptions();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip rate limiting for certain paths
        if (ShouldSkipRateLimit(context.Request.Path))
        {
            await _next(context);
            return;
        }

        var clientId = GetClientIdentifier(context);
        var endpoint = GetEndpointIdentifier(context);
        var now = DateTime.UtcNow;

        // Check if client is temporarily blocked
        if (IsClientBlocked(clientId, now))
        {
            await HandleBlockedClient(context, clientId);
            return;
        }

        // Get rate limit for this endpoint
        var limit = GetRateLimitForEndpoint(endpoint);
        
        // One client often sends several requests at once (app startup, page loads); its counters
        // are plain objects, so every read/write of them happens under a per-client lock.
        var clientInfo = _clients.GetOrAdd(clientId, _ => new ClientRequestInfo());
        int endpointCount;
        lock (clientInfo)
        {
            CleanupOldEndpointData(clientInfo, now);

            if (!clientInfo.EndpointCounts.TryGetValue(endpoint, out var endpointInfo))
            {
                endpointInfo = new EndpointRequestInfo { Count = 1, LastRequest = now };
                clientInfo.EndpointCounts[endpoint] = endpointInfo;
            }
            else if (now - endpointInfo.LastRequest > limit.TimeWindow)
            {
                endpointInfo.Count = 1;
                endpointInfo.LastRequest = now;
            }
            else
            {
                endpointInfo.Count++;
            }

            clientInfo.LastRequest = now;
            clientInfo.RequestCount++;
            endpointCount = endpointInfo.Count;
        }

        // Check endpoint-specific rate limit
        if (endpointCount > limit.RequestLimit)
        {
            await HandleRateLimitExceeded(context, clientId, endpoint, limit);
            return;
        }

        // Check for suspicious activity patterns
        DetectSuspiciousActivity(clientId, context, now);

        // Add rate limit headers
        AddRateLimitHeaders(context, endpointCount, limit);

        await _next(context);
    }

    private bool ShouldSkipRateLimit(string path)
    {
        var skipPaths = new[] { "/health", "/swagger", "/favicon.ico" };
        return skipPaths.Any(skipPath => path.StartsWith(skipPath, StringComparison.OrdinalIgnoreCase));
    }

    private string GetClientIdentifier(HttpContext context)
    {
        // Try to get user ID first (for authenticated requests)
        var userId = context.User?.FindFirst("sub")?.Value ?? context.User?.FindFirst("id")?.Value;
        if (!string.IsNullOrEmpty(userId))
            return $"user:{userId}";

        // Fall back to IP address. RemoteIpAddress is already the real client IP:
        // UseForwardedHeaders (Program.cs) applies X-Forwarded-For from the trusted reverse
        // proxy only, so a client-supplied header cannot be used to dodge the limit.
        return $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
    }

    private string GetEndpointIdentifier(HttpContext context)
    {
        var method = context.Request.Method;
        var path = context.Request.Path.Value ?? "/";
        
        // Normalize paths with IDs to generic patterns
        path = System.Text.RegularExpressions.Regex.Replace(path, @"/\d+", "/{id}");
        
        return $"{method}:{path}";
    }

    private RateLimitRule GetRateLimitForEndpoint(string endpoint)
    {
        // Session refresh happens automatically in every open client (every ~15 min and on 401),
        // and many users can share one public IP (mobile carrier CGNAT, offices) — keep it generous.
        if (endpoint.Contains("/auth/refresh-token") || endpoint.Contains("/auth/validate-token"))
        {
            return new RateLimitRule { RequestLimit = 60, TimeWindow = TimeSpan.FromMinutes(1) };
        }

        // Credential endpoints (login, register, password reset, social sign-in): limits brute force
        // per IP while still allowing several people behind a shared IP to sign in.
        if (endpoint.Contains("/auth/") || endpoint.Contains("/login") || endpoint.Contains("/register"))
        {
            return new RateLimitRule { RequestLimit = 20, TimeWindow = TimeSpan.FromMinutes(1) };
        }

        // File upload endpoints - very strict limits
        if (endpoint.Contains("/upload") || endpoint.Contains("/files"))
        {
            return new RateLimitRule { RequestLimit = 10, TimeWindow = TimeSpan.FromMinutes(1) };
        }

        // Search endpoints - moderate limits
        if (endpoint.Contains("/search"))
        {
            return new RateLimitRule { RequestLimit = 30, TimeWindow = TimeSpan.FromMinutes(1) };
        }

        // Default limits
        return new RateLimitRule { RequestLimit = _options.DefaultRequestLimit, TimeWindow = _options.DefaultTimeWindow };
    }

    private bool IsClientBlocked(string clientId, DateTime now)
    {
        if (!_suspiciousClients.TryGetValue(clientId, out var suspiciousActivity))
            return false;

        return suspiciousActivity.BlockedUntil > now;
    }

    private void DetectSuspiciousActivity(string clientId, HttpContext context, DateTime now)
    {
        var suspiciousActivity = _suspiciousClients.GetOrAdd(clientId, _ => new SuspiciousActivity());
        var userAgent = context.Request.Headers["User-Agent"].ToString();
        var block = (Duration: TimeSpan.Zero, Reason: "");

        lock (suspiciousActivity)
        {
            // Check for rapid sequential requests. A single page load already fires several requests in
            // parallel (profile, chat hub, unread count, lists), and IPs can be shared, so only sustained
            // hammering (well beyond normal bursts) leads to a short block.
            if (suspiciousActivity.LastRequestTime.HasValue && 
                (now - suspiciousActivity.LastRequestTime.Value).TotalMilliseconds < 100)
            {
                suspiciousActivity.RapidRequestCount++;
                if (suspiciousActivity.RapidRequestCount > 100)
                {
                    block = (TimeSpan.FromMinutes(1), "Rapid sequential requests detected");
                }
            }
            else
            {
                suspiciousActivity.RapidRequestCount = 0;
            }

            // Check for suspicious user agents
            if (IsSuspiciousUserAgent(userAgent))
            {
                suspiciousActivity.SuspiciousUserAgentCount++;
                if (suspiciousActivity.SuspiciousUserAgentCount > 3)
                {
                    block = (TimeSpan.FromMinutes(15), "Suspicious user agent detected");
                }
            }

            suspiciousActivity.LastRequestTime = now;
        }

        if (block.Duration > TimeSpan.Zero)
        {
            BlockClient(clientId, block.Duration, block.Reason);
        }
    }

    private bool IsSuspiciousUserAgent(string userAgent)
    {
        // No User-Agent is normal for native apps: the iOS app's SignalR (chat) connection sends
        // none, and blocking on it locked whole IPs out for 15 minutes.
        if (string.IsNullOrWhiteSpace(userAgent))
            return false;

        var suspiciousPatterns = new[]
        {
            "bot", "crawler", "spider", "scraper", "curl", "wget", "python", "java", "go-http-client"
        };

        return suspiciousPatterns.Any(pattern => 
            userAgent.Contains(pattern, StringComparison.OrdinalIgnoreCase));
    }

    private void BlockClient(string clientId, TimeSpan duration, string reason)
    {
        var suspiciousActivity = _suspiciousClients.GetOrAdd(clientId, new SuspiciousActivity());
        suspiciousActivity.BlockedUntil = DateTime.UtcNow.Add(duration);
        
        _logger.LogWarning("Client {ClientId} blocked for {Duration} minutes. Reason: {Reason}", 
            clientId, duration.TotalMinutes, reason);
    }

    private void CleanupOldEndpointData(ClientRequestInfo clientInfo, DateTime now)
    {
        var keysToRemove = clientInfo.EndpointCounts
            .Where(kvp => now - kvp.Value.LastRequest > TimeSpan.FromHours(1))
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in keysToRemove)
        {
            clientInfo.EndpointCounts.Remove(key);
        }
    }

    private async Task HandleRateLimitExceeded(HttpContext context, string clientId, string endpoint, RateLimitRule limit)
    {
        _logger.LogWarning("Rate limit exceeded for client {ClientId} on endpoint {Endpoint}", clientId, endpoint);
        
        context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
        context.Response.ContentType = "application/json";
        
        var response = new
        {
            error = "Rate limit exceeded",
            message = "Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.",
            retryAfter = (int)limit.TimeWindow.TotalSeconds
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }

    private async Task HandleBlockedClient(HttpContext context, string clientId)
    {
        _logger.LogWarning("Blocked client {ClientId} attempted to make request", clientId);
        
        context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
        context.Response.ContentType = "application/json";
        
        var response = new
        {
            error = "Client blocked",
            message = "Şüpheli aktivite nedeniyle erişiminiz geçici olarak engellenmiştir."
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }

    private void AddRateLimitHeaders(HttpContext context, int currentCount, RateLimitRule limit)
    {
        context.Response.Headers.Add("X-RateLimit-Limit", limit.RequestLimit.ToString());
        context.Response.Headers.Add("X-RateLimit-Remaining", Math.Max(0, limit.RequestLimit - currentCount).ToString());
        context.Response.Headers.Add("X-RateLimit-Reset", DateTimeOffset.UtcNow.Add(limit.TimeWindow).ToUnixTimeSeconds().ToString());
    }

    private class ClientRequestInfo
    {
        public DateTime LastRequest { get; set; }
        public int RequestCount { get; set; }
        public Dictionary<string, EndpointRequestInfo> EndpointCounts { get; set; } = new();
    }

    private class EndpointRequestInfo
    {
        public int Count { get; set; }
        public DateTime LastRequest { get; set; }
    }

    private class SuspiciousActivity
    {
        public DateTime? LastRequestTime { get; set; }
        public int RapidRequestCount { get; set; }
        public int SuspiciousUserAgentCount { get; set; }
        public DateTime? BlockedUntil { get; set; }
    }

    private class RateLimitRule
    {
        public int RequestLimit { get; set; }
        public TimeSpan TimeWindow { get; set; }
    }
}

public class RateLimitOptions
{
    public int DefaultRequestLimit { get; set; } = 100;
    public TimeSpan DefaultTimeWindow { get; set; } = TimeSpan.FromMinutes(1);
}