using System.Security.Claims;
using API.Data;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

/// <summary>User-facing reports (şikayet) about listings, messages and users.</summary>
[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private const string ReceivedMessage = "Şikayetiniz alındı. İnceleyip gerekli işlemi yapacağız.";
    private readonly ApplicationDbContext _context;

    public ReportsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<ActionResult> CreateReport([FromBody] CreateReportRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı." });
        }
        if (User.FindFirst("isGuest")?.Value == "True")
        {
            return StatusCode(403, new { message = "Şikayet edebilmek için hesap oluşturmanız gerekiyor." });
        }

        var targetType = request.TargetType!.Value;
        var reason = request.Reason!.Value;
        var targetId = request.TargetId.Trim();
        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();

        // Resolve the target and the user it belongs to
        string? targetUserId = null;
        switch (targetType)
        {
            case ReportTargetType.Need:
            {
                if (!int.TryParse(targetId, out var needId)) return NotFound(new { message = "İlan bulunamadı." });
                var need = await _context.Needs.AsNoTracking().FirstOrDefaultAsync(n => n.Id == needId);
                if (need == null) return NotFound(new { message = "İlan bulunamadı." });
                targetUserId = need.UserId;
                targetId = needId.ToString();
                break;
            }
            case ReportTargetType.Message:
            {
                if (!int.TryParse(targetId, out var messageId)) return NotFound(new { message = "Mesaj bulunamadı." });
                var message = await _context.Messages.AsNoTracking()
                    .Where(m => m.Id == messageId)
                    .Select(m => new { m.SenderId, m.Offer.ProviderId, BuyerId = m.Offer.Need.UserId })
                    .FirstOrDefaultAsync();
                // Only participants of the conversation can report its messages.
                if (message == null || (message.ProviderId != userId && message.BuyerId != userId))
                {
                    return NotFound(new { message = "Mesaj bulunamadı." });
                }
                targetUserId = message.SenderId;
                targetId = messageId.ToString();
                break;
            }
            case ReportTargetType.User:
            {
                var exists = await _context.Users.AnyAsync(u => u.Id == targetId && !u.IsGuest);
                if (!exists) return NotFound(new { message = "Kullanıcı bulunamadı." });
                targetUserId = targetId;
                break;
            }
        }

        if (targetUserId == userId)
        {
            return BadRequest(new { message = "Kendi içeriğinizi şikayet edemezsiniz." });
        }

        var alreadyOpen = await _context.Reports.AnyAsync(r =>
            r.ReporterId == userId && r.TargetType == targetType && r.TargetId == targetId && r.Status == ReportStatus.Open);

        if (!alreadyOpen)
        {
            _context.Reports.Add(new Report
            {
                ReporterId = userId,
                TargetType = targetType,
                TargetId = targetId,
                TargetUserId = targetUserId,
                Reason = reason,
                Note = note,
                Status = ReportStatus.Open,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = ReceivedMessage });
    }
}
