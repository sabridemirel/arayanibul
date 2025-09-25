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
        
        var clientInfo = _clients.AddOrUpdate(clientId, 
            new ClientRequestInfo 
            { 
                LastRequest = now, 
                RequestCount = 1,
                EndpointCounts = new Dictionary<string, EndpointRequestInfo>
                {
                    { endpoint, new EndpointRequestInfo { Count = 1, LastRequest = now } }
                }
            },
            (key, existing) =>
            {
                // Clean up old endpoint data
                CleanupOldEndpointData(existing, now);
                
                if (!existing.EndpointCounts.ContainsKey(endpoint))
                {
                    existing.EndpointCounts[endpoint] = new EndpointRequestInfo { Count = 1, LastRequest = now };
                }
                else
                {
                    var endpointInfo = existing.EndpointCounts[endpoint];
                    if (now - endpointInfo.LastRequest > limit.TimeWindow)
                    {
                        endpointInfo.Count = 1;
                        endpointInfo.LastRequest = now;
                    }
                    else
                    {
                        endpointInfo.Count++;
                    }
                }
                
                existing.LastRequest = now;
                existing.RequestCount++;
                return existing;
            });

        // Check endpoint-specific rate limit
        if (clientInfo.EndpointCounts.TryGetValue(endpoint, out var endpointRequestInfo) && 
            endpointRequestInfo.Count > limit.RequestLimit)
        {
            await HandleRateLimitExceeded(context, clientId, endpoint, limit);
            return;
        }

        // Check for suspicious activity patterns
        DetectSuspiciousActivity(clientId, context, now);

        // Add rate limit headers
        AddRateLimitHeaders(context, endpointRequestInfo?.Count ?? 0, limit);

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

        // Fall back to IP address
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            var ip = forwardedFor.Split(',')[0].Trim();
            return $"ip:{ip}";
        }

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
        // Authentication endpoints - stricter limits
        if (endpoint.Contains("/auth/") || endpoint.Contains("/login") || endpoint.Contains("/register"))
        {
            return new RateLimitRule { RequestLimit = 5, TimeWindow = TimeSpan.FromMinutes(1) };
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
        var suspiciousActivity = _suspiciousClients.GetOrAdd(clientId, new SuspiciousActivity());

        // Check for rapid sequential requests
        if (suspiciousActivity.LastRequestTime.HasValue && 
            (now - suspiciousActivity.LastRequestTime.Value).TotalMilliseconds < 100)
        {
            suspiciousActivity.RapidRequestCount++;
            if (suspiciousActivity.RapidRequestCount > 10)
            {
                BlockClient(clientId, TimeSpan.FromMinutes(5), "Rapid sequential requests detected");
            }
        }
        else
        {
            suspiciousActivity.RapidRequestCount = 0;
        }

        // Check for suspicious user agents
        var userAgent = context.Request.Headers["User-Agent"].ToString();
        if (IsSuspiciousUserAgent(userAgent))
        {
            suspiciousActivity.SuspiciousUserAgentCount++;
            if (suspiciousActivity.SuspiciousUserAgentCount > 3)
            {
                BlockClient(clientId, TimeSpan.FromMinutes(15), "Suspicious user agent detected");
            }
        }

        suspiciousActivity.LastRequestTime = now;
    }

    private bool IsSuspiciousUserAgent(string userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
            return true;

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