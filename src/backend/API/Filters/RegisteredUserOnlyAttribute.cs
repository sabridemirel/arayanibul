using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace API.Filters;

/// <summary>
/// Guests can only browse. Actions that create or change content (needs, offers, messages,
/// reviews) require a registered account; guests get 403 with a message the clients show.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RegisteredUserOnlyAttribute : ActionFilterAttribute
{
    public const string ErrorCode = "GUEST_NOT_ALLOWED";

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        if (context.HttpContext.User.FindFirst("isGuest")?.Value == "True")
        {
            context.Result = new ObjectResult(new
            {
                code = ErrorCode,
                message = "Bu işlem için üye olmanız gerekiyor. Misafir olarak yalnızca ilanları görüntüleyebilirsiniz."
            })
            { StatusCode = StatusCodes.Status403Forbidden };
        }
    }
}
