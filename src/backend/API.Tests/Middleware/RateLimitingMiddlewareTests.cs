using System.Net;
using API.Middleware;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace API.Tests.Middleware;

public class RateLimitingMiddlewareTests
{
    // Regression: a client that fires many requests at once (the mobile app does on startup)
    // made the per-client endpoint dictionary get mutated concurrently, so requests failed
    // with "Collection was modified" (HTTP 500) — e.g. guest login.
    [Fact]
    public async Task ConcurrentRequestsFromSameClient_DoNotThrow()
    {
        var middleware = new RateLimitingMiddleware(
            _ => Task.CompletedTask,
            NullLogger<RateLimitingMiddleware>.Instance,
            new RateLimitOptions { DefaultRequestLimit = 1_000_000, DefaultTimeWindow = TimeSpan.FromMinutes(1) });

        // Unique IP so the static client table does not interfere with other tests
        var ip = IPAddress.Parse($"10.{Random.Shared.Next(255)}.{Random.Shared.Next(255)}.{Random.Shared.Next(1, 255)}");

        var tasks = Enumerable.Range(0, 20_000).Select(i => Task.Run(async () =>
        {
            var context = new DefaultHttpContext();
            context.Connection.RemoteIpAddress = ip;
            context.Request.Method = "GET";
            context.Request.Path = $"/api/endpoint{i % 500}";
            context.Request.Headers.UserAgent = "Arayanibul/1.0";
            await middleware.InvokeAsync(context);
        }));

        var act = async () => await Task.WhenAll(tasks);

        await act.Should().NotThrowAsync();
    }
}
