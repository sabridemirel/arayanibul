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

public class RateLimitingUserAgentTests
{
    // Regression: the iOS app's SignalR connection sends no User-Agent. Treating that as a bot
    // blocked the whole IP for 15 minutes after a few requests (every iPhone user on chat).
    [Fact]
    public async Task RequestsWithoutUserAgent_AreNotBlocked()
    {
        var middleware = new RateLimitingMiddleware(
            _ => Task.CompletedTask,
            NullLogger<RateLimitingMiddleware>.Instance,
            new RateLimitOptions { DefaultRequestLimit = 1000, DefaultTimeWindow = TimeSpan.FromMinutes(1) });
        var ip = IPAddress.Parse($"10.{Random.Shared.Next(255)}.{Random.Shared.Next(255)}.{Random.Shared.Next(1, 255)}");

        var statuses = new List<int>();
        for (var i = 0; i < 10; i++)
        {
            var context = new DefaultHttpContext();
            context.Connection.RemoteIpAddress = ip;
            context.Request.Method = "GET";
            context.Request.Path = "/chathub/negotiate";
            context.Response.Body = new MemoryStream();
            await middleware.InvokeAsync(context);
            statuses.Add(context.Response.StatusCode);
        }

        statuses.Should().AllSatisfy(s => s.Should().Be(StatusCodes.Status200OK));
    }

    // Regression: a few requests with a tool user agent (python-urllib, curl) blocked the whole IP
    // for 15 minutes, locking out every real user behind the same Wi-Fi / mobile carrier NAT.
    [Theory]
    [InlineData("Python-urllib/3.9")]
    [InlineData("curl/8.7.1")]
    [InlineData("Googlebot/2.1")]
    public async Task ToolOrBotUserAgents_DoNotBlockTheIp(string userAgent)
    {
        var middleware = new RateLimitingMiddleware(
            _ => Task.CompletedTask,
            NullLogger<RateLimitingMiddleware>.Instance,
            new RateLimitOptions { DefaultRequestLimit = 1000, DefaultTimeWindow = TimeSpan.FromMinutes(1) });
        var ip = IPAddress.Parse($"10.{Random.Shared.Next(255)}.{Random.Shared.Next(255)}.{Random.Shared.Next(1, 255)}");

        async Task<int> Send(string ua)
        {
            var context = new DefaultHttpContext();
            context.Connection.RemoteIpAddress = ip;
            context.Request.Method = "GET";
            context.Request.Path = "/api/need";
            context.Request.Headers.UserAgent = ua;
            context.Response.Body = new MemoryStream();
            await middleware.InvokeAsync(context);
            return context.Response.StatusCode;
        }

        for (var i = 0; i < 10; i++) await Send(userAgent);

        // A browser on the same IP must still get through
        (await Send("Mozilla/5.0 (iPhone)")).Should().Be(StatusCodes.Status200OK);
    }
}
