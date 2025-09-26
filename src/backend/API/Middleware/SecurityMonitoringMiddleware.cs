using System.Text;
using System.Text.Json;

namespace API.Middleware;

public class SecurityMonitoringMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SecurityMonitoringMiddleware> _logger;
    private readonly SecurityMonitoringOptions _options;

    public SecurityMonitoringMiddleware(RequestDelegate next, ILogger<SecurityMonitoringMiddleware> logger,
        SecurityMonitoringOptions? options = null)
    {
        _next = next;
        _logger = logger;
        _options = options ?? new SecurityMonitoringOptions();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var startTime = DateTime.UtcNow;
        var requestId = Guid.NewGuid().ToString("N")[..8];
        
        // Add request ID to context for tracking
        context.Items["RequestId"] = requestId;

        try
        {
            // Log incoming request if enabled
            if (_options.LogRequests)
            {
                await LogRequest(context, requestId);
            }

            // Check for suspicious patterns
            if (_options.EnableThreatDetection)
            {
                var threatDetected = await DetectThreats(context);
                if (threatDetected)
                {
                    await HandleThreat(context, requestId);
                    return;
                }
            }

            await _next(context);

            // Log response if enabled
            if (_options.LogResponses)
            {
                LogResponse(context, requestId, startTime);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Security monitoring error for request {RequestId}", requestId);
            throw;
        }
    }

    private async Task LogRequest(HttpContext context, string requestId)
    {
        var request = context.Request;
        var clientIp = GetClientIpAddress(context);
        var userAgent = request.Headers["User-Agent"].ToString();
        var userId = context.User?.FindFirst("sub")?.Value ?? "anonymous";

        var logData = new
        {
            RequestId = requestId,
            Timestamp = DateTime.UtcNow,
            Method = request.Method,
            Path = request.Path.Value,
            QueryString = request.QueryString.Value,
            ClientIp = clientIp,
            UserAgent = userAgent,
            UserId = userId,
            ContentType = request.ContentType,
            ContentLength = request.ContentLength,
            Headers = GetSafeHeaders(request.Headers)
        };

        _logger.LogInformation("Request: {RequestData}", JsonSerializer.Serialize(logData));

        // Log request body for sensitive endpoints (with size limit)
        if (ShouldLogRequestBody(request.Path) && request.ContentLength > 0 && request.ContentLength < 10240)
        {
            request.EnableBuffering();
            var body = await ReadRequestBody(request);
            if (!string.IsNullOrEmpty(body))
            {
                _logger.LogInformation("Request body for {RequestId}: {Body}", requestId, body);
            }
        }
    }

    private void LogResponse(HttpContext context, string requestId, DateTime startTime)
    {
        var duration = DateTime.UtcNow - startTime;
        var response = context.Response;

        var logData = new
        {
            RequestId = requestId,
            StatusCode = response.StatusCode,
            Duration = duration.TotalMilliseconds,
            ContentType = response.ContentType,
            ContentLength = response.ContentLength
        };

        var logLevel = response.StatusCode >= 400 ? LogLevel.Warning : LogLevel.Information;
        _logger.Log(logLevel, "Response: {ResponseData}", JsonSerializer.Serialize(logData));
    }

    private async Task<bool> DetectThreats(HttpContext context)
    {
        var request = context.Request;
        
        // Skip threat detection for development/swagger endpoints
        if (IsWhitelistedPath(request.Path.Value))
        {
            return false;
        }
        
        var threats = new List<string>();

        // Check for SQL injection patterns
        if (ContainsSqlInjectionPatterns(request.QueryString.Value))
        {
            threats.Add("SQL Injection in query string");
        }

        // Check for XSS patterns
        if (ContainsXssPatterns(request.QueryString.Value))
        {
            threats.Add("XSS in query string");
        }

        // Check for path traversal
        if (ContainsPathTraversal(request.Path.Value))
        {
            threats.Add("Path traversal attempt");
        }

        // Check request body for threats (if applicable)
        if (request.ContentLength > 0 && request.ContentLength < 10240)
        {
            request.EnableBuffering();
            var body = await ReadRequestBody(request);
            
            if (ContainsSqlInjectionPatterns(body))
            {
                threats.Add("SQL Injection in request body");
            }
            
            if (ContainsXssPatterns(body))
            {
                threats.Add("XSS in request body");
            }
        }

        // Check for suspicious headers (but skip common browser headers)
        var suspiciousHeaders = DetectSuspiciousHeaders(request.Headers);
        threats.AddRange(suspiciousHeaders);

        // Check for unusual request patterns
        if (IsUnusualRequest(context))
        {
            threats.Add("Unusual request pattern");
        }

        if (threats.Any())
        {
            var clientIp = GetClientIpAddress(context);
            var userAgent = request.Headers["User-Agent"].ToString();
            
            _logger.LogWarning("Security threats detected from {ClientIp}: {Threats}. Path: {Path}, UserAgent: {UserAgent}",
                clientIp, string.Join(", ", threats), request.Path.Value, userAgent);
            
            return true;
        }

        return false;
    }

    private bool IsWhitelistedPath(string? path)
    {
        if (string.IsNullOrEmpty(path))
            return false;

        var whitelistedPaths = new[]
        {
            "/swagger",
            "/health",
            "/_framework",
            "/favicon.ico",
            "/api/category",  // Allow category endpoints
            "/api/auth",      // Allow auth endpoints
            "/api/need"       // Allow need endpoints for public access
        };

        return whitelistedPaths.Any(whitelist =>
            path.StartsWith(whitelist, StringComparison.OrdinalIgnoreCase));
    }

    private async Task HandleThreat(HttpContext context, string requestId)
    {
        context.Response.StatusCode = 403;
        context.Response.ContentType = "application/json";

        var response = new
        {
            error = "Security violation detected",
            message = "İsteğiniz güvenlik kurallarını ihlal ediyor.",
            requestId = requestId
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }

    private bool ContainsSqlInjectionPatterns(string? input)
    {
        if (string.IsNullOrEmpty(input))
            return false;

        var sqlPatterns = new[]
        {
            @"\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b",
            @"[';]--",
            @"[';]/\*",
            @"\*/",
            @"@@version",
            @"information_schema",
            @"sys\.tables",
            @"master\.dbo",
            @"xp_cmdshell",
            @"sp_executesql"
        };

        return sqlPatterns.Any(pattern => 
            System.Text.RegularExpressions.Regex.IsMatch(input, pattern, 
                System.Text.RegularExpressions.RegexOptions.IgnoreCase));
    }

    private bool ContainsXssPatterns(string? input)
    {
        if (string.IsNullOrEmpty(input))
            return false;

        var xssPatterns = new[]
        {
            @"<script[^>]*>",
            @"</script>",
            @"javascript:",
            @"vbscript:",
            @"onload\s*=",
            @"onerror\s*=",
            @"onclick\s*=",
            @"onmouseover\s*=",
            @"eval\s*\(",
            @"expression\s*\(",
            @"document\.cookie",
            @"document\.write",
            @"window\.location"
        };

        return xssPatterns.Any(pattern => 
            System.Text.RegularExpressions.Regex.IsMatch(input, pattern, 
                System.Text.RegularExpressions.RegexOptions.IgnoreCase));
    }

    private bool ContainsPathTraversal(string? path)
    {
        if (string.IsNullOrEmpty(path))
            return false;

        var pathTraversalPatterns = new[]
        {
            @"\.\./",
            @"\.\.\\",
            @"%2e%2e%2f",
            @"%2e%2e%5c",
            @"..%2f",
            @"..%5c"
        };

        return pathTraversalPatterns.Any(pattern => 
            path.Contains(pattern, StringComparison.OrdinalIgnoreCase));
    }

    private List<string> DetectSuspiciousHeaders(IHeaderDictionary headers)
    {
        var threats = new List<string>();

        // Check for suspicious User-Agent
        var userAgent = headers["User-Agent"].ToString();
        if (string.IsNullOrEmpty(userAgent) || IsSuspiciousUserAgent(userAgent))
        {
            threats.Add("Suspicious User-Agent");
        }

        // Check for suspicious X-Forwarded-For chains
        var forwardedFor = headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrEmpty(forwardedFor) && forwardedFor.Split(',').Length > 5)
        {
            threats.Add("Suspicious X-Forwarded-For chain");
        }

        // Check for injection attempts in headers (skip common browser headers)
        var skipHeaders = new[] { "accept", "accept-encoding", "accept-language", "user-agent", "host", "connection" };
        
        foreach (var header in headers)
        {
            if (skipHeaders.Contains(header.Key.ToLowerInvariant()))
                continue;
                
            if (ContainsSqlInjectionPatterns(header.Value) || ContainsXssPatterns(header.Value))
            {
                threats.Add($"Injection attempt in header: {header.Key}");
            }
        }

        return threats;
    }

    private bool IsSuspiciousUserAgent(string userAgent)
    {
        // Allow legitimate mobile/app user agents
        var allowedPatterns = new[]
        {
            "axios", "react-native", "expo", "okhttp", "mozilla", "webkit", "chrome", "safari", "edge", "firefox"
        };

        // If user agent contains allowed patterns, it's not suspicious
        if (allowedPatterns.Any(pattern =>
            userAgent.Contains(pattern, StringComparison.OrdinalIgnoreCase)))
        {
            return false;
        }

        var suspiciousPatterns = new[]
        {
            "sqlmap", "nikto", "nmap", "masscan", "zap", "burp", "w3af", "acunetix",
            "nessus", "openvas", "qualys", "rapid7", "metasploit", "havij",
            "python-requests", "curl/", "wget/", "libwww-perl", "lwp-trivial"
        };

        return suspiciousPatterns.Any(pattern =>
            userAgent.Contains(pattern, StringComparison.OrdinalIgnoreCase));
    }

    private bool IsUnusualRequest(HttpContext context)
    {
        var request = context.Request;

        // Check for unusual content types
        var contentType = request.ContentType?.ToLowerInvariant();
        if (!string.IsNullOrEmpty(contentType))
        {
            var allowedContentTypes = new[]
            {
                "application/json", "application/x-www-form-urlencoded", 
                "multipart/form-data", "text/plain", "application/xml"
            };

            if (!allowedContentTypes.Any(allowed => contentType.StartsWith(allowed)))
            {
                return true;
            }
        }

        // Check for unusual request methods on specific endpoints
        if (request.Path.StartsWithSegments("/api") && 
            !new[] { "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS" }.Contains(request.Method))
        {
            return true;
        }

        // Check for unusually large requests
        if (request.ContentLength > 50 * 1024 * 1024) // 50MB
        {
            return true;
        }

        return false;
    }

    private async Task<string> ReadRequestBody(HttpRequest request)
    {
        request.Body.Position = 0;
        using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        request.Body.Position = 0;
        return body;
    }

    private string GetClientIpAddress(HttpContext context)
    {
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private bool ShouldLogRequestBody(string path)
    {
        var sensitiveEndpoints = new[]
        {
            "/auth/", "/login", "/register", "/password"
        };

        return sensitiveEndpoints.Any(endpoint => 
            path.Contains(endpoint, StringComparison.OrdinalIgnoreCase));
    }

    private Dictionary<string, string> GetSafeHeaders(IHeaderDictionary headers)
    {
        var safeHeaders = new Dictionary<string, string>();
        var sensitiveHeaders = new[] { "authorization", "cookie", "x-api-key" };

        foreach (var header in headers)
        {
            if (sensitiveHeaders.Contains(header.Key.ToLowerInvariant()))
            {
                safeHeaders[header.Key] = "[REDACTED]";
            }
            else
            {
                safeHeaders[header.Key] = header.Value.ToString();
            }
        }

        return safeHeaders;
    }
}

public class SecurityMonitoringOptions
{
    public bool LogRequests { get; set; } = true;
    public bool LogResponses { get; set; } = true;
    public bool EnableThreatDetection { get; set; } = true;
    public bool LogSensitiveEndpoints { get; set; } = true;
}