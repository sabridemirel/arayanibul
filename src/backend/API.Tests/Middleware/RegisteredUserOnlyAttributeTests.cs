using System.Security.Claims;
using API.Filters;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Xunit;

namespace API.Tests.Middleware;

public class RegisteredUserOnlyAttributeTests
{
    private static ActionExecutingContext ContextFor(bool isGuest)
    {
        var http = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("isGuest", isGuest.ToString()) }, "test"))
        };
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor());
        return new ActionExecutingContext(action, new List<IFilterMetadata>(), new Dictionary<string, object?>(), new object());
    }

    [Fact]
    public void Guest_IsRejectedWith403()
    {
        var ctx = ContextFor(isGuest: true);
        new RegisteredUserOnlyAttribute().OnActionExecuting(ctx);
        ctx.Result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public void RegisteredUser_IsAllowed()
    {
        var ctx = ContextFor(isGuest: false);
        new RegisteredUserOnlyAttribute().OnActionExecuting(ctx);
        ctx.Result.Should().BeNull();
    }
}
