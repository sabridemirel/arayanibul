using System.Security.Claims;
using API.Interfaces;
using API.Middleware;
using API.Models;
using API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = AppRoles.Admin)]
public class AdminController : ControllerBase
{
    private readonly AdminService _adminService;
    private readonly IContentModerationService _moderation;

    public AdminController(AdminService adminService, IContentModerationService moderation)
    {
        _adminService = adminService;
        _moderation = moderation;
    }

    private string AdminId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;

    private async Task<ActionResult> Run<T>(Func<Task<T>> action)
    {
        try
        {
            return Ok(await action());
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ValidationException ex)
        {
            var first = ex.Errors.Values.SelectMany(v => v).FirstOrDefault() ?? "Geçersiz istek.";
            return BadRequest(new { message = first, errors = ex.Errors });
        }
    }

    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsResponse>> GetStats() => Ok(await _adminService.GetStatsAsync());

    // ---------------- Needs ----------------

    [HttpGet("needs")]
    public async Task<ActionResult<PagedResult<AdminNeedItem>>> GetNeeds(
        [FromQuery] NeedStatus? status = null,
        [FromQuery] string? search = null,
        [FromQuery] bool flaggedOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
        => Ok(await _adminService.GetNeedsAsync(status, search, flaggedOnly, page, pageSize));

    [HttpPost("needs/{id:int}/approve")]
    public Task<ActionResult> ApproveNeed(int id)
        => Run(() => _adminService.ApproveNeedAsync(id, AdminId));

    [HttpPost("needs/{id:int}/reject")]
    public Task<ActionResult> RejectNeed(int id, [FromBody] AdminRejectNeedRequest request)
        => Run(() => _adminService.RejectNeedAsync(id, request.Reason!.Value, request.Note, AdminId, takeDown: false));

    [HttpPost("needs/{id:int}/take-down")]
    public Task<ActionResult> TakeDownNeed(int id, [FromBody] AdminRejectNeedRequest request)
        => Run(() => _adminService.RejectNeedAsync(id, request.Reason!.Value, request.Note, AdminId, takeDown: true));

    // ---------------- Reports ----------------

    [HttpGet("reports")]
    public async Task<ActionResult<PagedResult<AdminReportItem>>> GetReports(
        [FromQuery] ReportStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
        => Ok(await _adminService.GetReportsAsync(status, page, pageSize));

    [HttpPost("reports/{id:int}/resolve")]
    public Task<ActionResult> ResolveReport(int id, [FromBody] AdminResolveReportRequest request)
        => Run(() => _adminService.ResolveReportAsync(id, request.Action!.Value, request.Note, AdminId));

    // ---------------- Users ----------------

    [HttpGet("users")]
    public async Task<ActionResult<PagedResult<AdminUserItem>>> GetUsers(
        [FromQuery] string? search = null,
        [FromQuery] bool suspendedOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
        => Ok(await _adminService.GetUsersAsync(search, suspendedOnly, page, pageSize));

    [HttpPost("users/{id}/suspend")]
    public Task<ActionResult> SuspendUser(string id, [FromBody] AdminSuspendUserRequest request)
        => Run(async () =>
        {
            await _adminService.SuspendUserAsync(id, request.Reason, AdminId);
            return new { message = "Kullanıcı askıya alındı." };
        });

    [HttpPost("users/{id}/unsuspend")]
    public Task<ActionResult> UnsuspendUser(string id)
        => Run(async () =>
        {
            await _adminService.UnsuspendUserAsync(id, AdminId);
            return new { message = "Kullanıcının askısı kaldırıldı." };
        });

    // ---------------- Moderation keywords ----------------

    [HttpGet("moderation/keywords")]
    public async Task<ActionResult<ModerationKeywordsDto>> GetKeywords()
        => Ok(new ModerationKeywordsDto { Keywords = await _moderation.GetKeywordsAsync() });

    [HttpPut("moderation/keywords")]
    public async Task<ActionResult<ModerationKeywordsDto>> ReplaceKeywords([FromBody] ModerationKeywordsDto request)
        => Ok(new ModerationKeywordsDto { Keywords = await _moderation.ReplaceKeywordsAsync(request.Keywords ?? new List<string>()) });

    // ---------------- Products (Gerçek Fiyat) ----------------

    [HttpGet("products")]
    public async Task<IActionResult> GetProducts([FromServices] IProductPricingService pricing)
        => Ok(await pricing.GetAllProductsAsync());

    /// <summary>Sets a product's price ceiling and whether its price page is live.</summary>
    [HttpPut("products/{id:int}")]
    public async Task<IActionResult> UpdateProduct(
        int id, [FromBody] AdminProductRequest request, [FromServices] IProductPricingService pricing)
    {
        try
        {
            return Ok(await pricing.UpdateProductAsync(id, request));
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
