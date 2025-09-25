namespace API.Middleware;

public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SecurityHeadersMiddleware> _logger;
    private readonly SecurityHeadersOptions _options;

    public SecurityHeadersMiddleware(RequestDelegate next, ILogger<SecurityHeadersMiddleware> logger, 
        SecurityHeadersOptions? options = null)
    {
        _next = next;
        _logger = logger;
        _options = options ?? new SecurityHeadersOptions();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Add security headers before processing the request
        AddSecurityHeaders(context);

        // Hook into response starting to remove sensitive headers
        context.Response.OnStarting(() =>
        {
            RemoveSensitiveHeaders(context);
            return Task.CompletedTask;
        });

        await _next(context);
    }

    private void AddSecurityHeaders(HttpContext context)
    {
        var headers = context.Response.Headers;

        // Prevent clickjacking attacks
        if (_options.EnableXFrameOptions)
        {
            headers.Add("X-Frame-Options", "DENY");
        }

        // Prevent MIME type sniffing
        if (_options.EnableXContentTypeOptions)
        {
            headers.Add("X-Content-Type-Options", "nosniff");
        }

        // Enable XSS protection
        if (_options.EnableXXssProtection)
        {
            headers.Add("X-XSS-Protection", "1; mode=block");
        }

        // Strict Transport Security (HTTPS only)
        if (_options.EnableHsts && context.Request.IsHttps)
        {
            headers.Add("Strict-Transport-Security", 
                $"max-age={_options.HstsMaxAge}; includeSubDomains; preload");
        }

        // Content Security Policy
        if (_options.EnableContentSecurityPolicy && !string.IsNullOrEmpty(_options.ContentSecurityPolicy))
        {
            headers.Add("Content-Security-Policy", _options.ContentSecurityPolicy);
        }

        // Referrer Policy
        if (_options.EnableReferrerPolicy)
        {
            headers.Add("Referrer-Policy", "strict-origin-when-cross-origin");
        }

        // Permissions Policy (formerly Feature Policy)
        if (_options.EnablePermissionsPolicy)
        {
            headers.Add("Permissions-Policy", 
                "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
        }

        // Cross-Origin Embedder Policy
        if (_options.EnableCrossOriginEmbedderPolicy)
        {
            headers.Add("Cross-Origin-Embedder-Policy", "require-corp");
        }

        // Cross-Origin Opener Policy
        if (_options.EnableCrossOriginOpenerPolicy)
        {
            headers.Add("Cross-Origin-Opener-Policy", "same-origin");
        }

        // Cross-Origin Resource Policy
        if (_options.EnableCrossOriginResourcePolicy)
        {
            headers.Add("Cross-Origin-Resource-Policy", "same-origin");
        }

        // Cache Control for sensitive endpoints
        if (IsSensitiveEndpoint(context.Request.Path))
        {
            headers.Add("Cache-Control", "no-store, no-cache, must-revalidate, private");
            headers.Add("Pragma", "no-cache");
            headers.Add("Expires", "0");
        }

        // Custom security headers
        if (_options.CustomHeaders?.Any() == true)
        {
            foreach (var customHeader in _options.CustomHeaders)
            {
                headers.Add(customHeader.Key, customHeader.Value);
            }
        }
    }

    private void RemoveSensitiveHeaders(HttpContext context)
    {
        var headers = context.Response.Headers;

        // Remove server information
        headers.Remove("Server");
        headers.Remove("X-Powered-By");
        headers.Remove("X-AspNet-Version");
        headers.Remove("X-AspNetMvc-Version");

        // Remove other potentially sensitive headers
        var sensitiveHeaders = new[]
        {
            "X-SourceFiles",
            "X-Compile-Time",
            "X-Debug-Token",
            "X-Debug-Token-Link"
        };

        foreach (var header in sensitiveHeaders)
        {
            headers.Remove(header);
        }
    }

    private bool IsSensitiveEndpoint(string path)
    {
        var sensitiveEndpoints = new[]
        {
            "/auth/",
            "/login",
            "/register",
            "/profile",
            "/user",
            "/admin"
        };

        return sensitiveEndpoints.Any(endpoint => 
            path.Contains(endpoint, StringComparison.OrdinalIgnoreCase));
    }
}

public class SecurityHeadersOptions
{
    public bool EnableXFrameOptions { get; set; } = true;
    public bool EnableXContentTypeOptions { get; set; } = true;
    public bool EnableXXssProtection { get; set; } = true;
    public bool EnableHsts { get; set; } = true;
    public int HstsMaxAge { get; set; } = 31536000; // 1 year
    public bool EnableContentSecurityPolicy { get; set; } = true;
    public string ContentSecurityPolicy { get; set; } = 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'";
    public bool EnableReferrerPolicy { get; set; } = true;
    public bool EnablePermissionsPolicy { get; set; } = true;
    public bool EnableCrossOriginEmbedderPolicy { get; set; } = false; // Can break functionality
    public bool EnableCrossOriginOpenerPolicy { get; set; } = true;
    public bool EnableCrossOriginResourcePolicy { get; set; } = false; // Can break CORS
    public Dictionary<string, string>? CustomHeaders { get; set; }
}