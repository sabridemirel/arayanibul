using System.IO.Compression;

namespace API.Middleware;

public class ResponseCompressionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ResponseCompressionMiddleware> _logger;

    public ResponseCompressionMiddleware(RequestDelegate next, ILogger<ResponseCompressionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var acceptEncoding = context.Request.Headers.AcceptEncoding.ToString();
        
        if (ShouldCompress(context, acceptEncoding))
        {
            var originalBodyStream = context.Response.Body;
            
            using var compressionStream = GetCompressionStream(acceptEncoding, originalBodyStream);
            if (compressionStream != null)
            {
                context.Response.Body = compressionStream;
                
                if (acceptEncoding.Contains("gzip"))
                {
                    context.Response.Headers.ContentEncoding = "gzip";
                }
                else if (acceptEncoding.Contains("deflate"))
                {
                    context.Response.Headers.ContentEncoding = "deflate";
                }
                
                await _next(context);
                
                if (compressionStream.CanWrite)
                {
                    await compressionStream.FlushAsync();
                }
            }
            else
            {
                await _next(context);
            }
        }
        else
        {
            await _next(context);
        }
    }

    private static bool ShouldCompress(HttpContext context, string acceptEncoding)
    {
        // Don't compress if client doesn't support it
        if (string.IsNullOrEmpty(acceptEncoding))
            return false;

        // Don't compress if already compressed
        if (context.Response.Headers.ContentEncoding.Count > 0)
            return false;

        // Only compress JSON and text responses
        var contentType = context.Response.ContentType?.ToLower();
        if (contentType == null)
            return false;

        return contentType.Contains("application/json") ||
               contentType.Contains("text/") ||
               contentType.Contains("application/xml");
    }

    private static Stream? GetCompressionStream(string acceptEncoding, Stream originalStream)
    {
        if (acceptEncoding.Contains("gzip"))
        {
            return new GZipStream(originalStream, CompressionMode.Compress);
        }
        
        if (acceptEncoding.Contains("deflate"))
        {
            return new DeflateStream(originalStream, CompressionMode.Compress);
        }

        return null;
    }
}