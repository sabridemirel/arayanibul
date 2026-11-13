using System.Net;
using System.Text.Json;
using API.Data;
using API.Interfaces;
using API.Middleware;
using API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace API.Services;

/// <summary>Listing moderation, reports and user suspension for the admin panel.</summary>
public class AdminService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IEmailService _emailService;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AdminService> _logger;

    public AdminService(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        IEmailService emailService,
        IMemoryCache cache,
        IConfiguration configuration,
        ILogger<AdminService> logger)
    {
        _context = context;
        _userManager = userManager;
        _emailService = emailService;
        _cache = cache;
        _configuration = configuration;
        _logger = logger;
    }

    public static (int Page, int PageSize) NormalizePaging(int page, int pageSize)
        => (Math.Max(1, page), pageSize <= 0 ? 20 : Math.Min(pageSize, 100));

    /// <summary>Start of "today" in Turkey time (UTC+3), expressed in UTC.</summary>
    private static DateTime TodayStartUtc()
    {
        var turkeyNow = DateTime.UtcNow.AddHours(3);
        return DateTime.SpecifyKind(turkeyNow.Date.AddHours(-3), DateTimeKind.Utc);
    }

    // ---------------- Stats ----------------

    public async Task<AdminStatsResponse> GetStatsAsync()
    {
        var today = TodayStartUtc();
        return new AdminStatsResponse
        {
            PendingNeeds = await _context.Needs.CountAsync(n => n.Status == NeedStatus.PendingReview),
            OpenReports = await _context.Reports.CountAsync(r => r.Status == ReportStatus.Open),
            SuspendedUsers = await _context.Users.CountAsync(u => u.SuspendedAt != null),
            ApprovedToday = await _context.Needs.CountAsync(n => n.ApprovedAt != null && n.ApprovedAt >= today),
            RejectedToday = await _context.Needs.CountAsync(n =>
                n.Status == NeedStatus.Rejected && n.ReviewedAt != null && n.ReviewedAt >= today)
        };
    }

    // ---------------- Needs ----------------

    public async Task<PagedResult<AdminNeedItem>> GetNeedsAsync(NeedStatus? status, string? search, bool flaggedOnly, int page, int pageSize)
    {
        (page, pageSize) = NormalizePaging(page, pageSize);

        var query = _context.Needs.AsNoTracking().AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(n => n.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(n =>
                EF.Functions.ILike(n.Title, term) ||
                EF.Functions.ILike(n.Description, term) ||
                (n.User.Email != null && EF.Functions.ILike(n.User.Email, term)) ||
                EF.Functions.ILike(n.User.FirstName + " " + n.User.LastName, term));
        }

        if (flaggedOnly)
        {
            query = query.Where(n => n.FlaggedTerms != null && n.FlaggedTerms != "");
        }

        var totalCount = await query.CountAsync();

        query = status == NeedStatus.PendingReview
            // Review queue: flagged first, then oldest submission first
            ? query.OrderByDescending(n => n.FlaggedTerms != null && n.FlaggedTerms != "")
                   .ThenBy(n => n.UpdatedAt)
                   .ThenBy(n => n.Id)
            : query.OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id);

        var needIds = await query.Skip((page - 1) * pageSize).Take(pageSize).Select(n => n.Id).ToListAsync();
        var items = await LoadAdminNeedItemsAsync(needIds);

        return new PagedResult<AdminNeedItem>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    private async Task<List<AdminNeedItem>> LoadAdminNeedItemsAsync(List<int> needIds)
    {
        if (needIds.Count == 0) return new List<AdminNeedItem>();

        var needs = await _context.Needs
            .AsNoTracking()
            .Include(n => n.Category)
            .Include(n => n.Images)
            .Include(n => n.User)
            .Where(n => needIds.Contains(n.Id))
            .ToListAsync();

        var userIds = needs.Select(n => n.UserId).Distinct().ToList();
        var userStats = await _context.Needs
            .Where(n => userIds.Contains(n.UserId))
            .GroupBy(n => n.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                Total = g.Count(),
                Rejected = g.Count(n => n.Status == NeedStatus.Rejected)
            })
            .ToDictionaryAsync(x => x.UserId);

        var byId = needs.ToDictionary(n => n.Id);
        return needIds.Where(byId.ContainsKey).Select(id =>
        {
            var n = byId[id];
            userStats.TryGetValue(n.UserId, out var stats);
            return MapAdminNeed(n, stats?.Total ?? 0, stats?.Rejected ?? 0);
        }).ToList();
    }

    private static AdminNeedItem MapAdminNeed(Need n, int totalNeeds, int rejectedNeeds) => new()
    {
        Id = n.Id,
        Title = n.Title,
        Description = n.Description,
        CategoryName = n.Category?.NameTr ?? n.Category?.Name ?? string.Empty,
        MinBudget = n.MinBudget,
        MaxBudget = n.MaxBudget,
        Currency = n.Currency,
        Address = n.Address,
        Urgency = n.Urgency,
        Status = n.Status,
        CreatedAt = n.CreatedAt,
        ApprovedAt = n.ApprovedAt,
        RejectionReason = n.RejectionReason,
        RejectionReasonText = ModerationLabels.For(n.RejectionReason),
        RejectionNote = n.RejectionNote,
        FlaggedTerms = SplitTerms(n.FlaggedTerms),
        Images = n.Images.OrderBy(i => i.SortOrder).Select(i => new AdminNeedImage { Id = i.Id, ImageUrl = i.ImageUrl }).ToList(),
        User = new AdminNeedUser
        {
            Id = n.UserId,
            FullName = FullName(n.User),
            Email = n.User?.Email ?? string.Empty,
            CreatedAt = n.User?.CreatedAt ?? default,
            TotalNeeds = totalNeeds,
            RejectedNeeds = rejectedNeeds,
            IsSuspended = n.User?.SuspendedAt != null
        }
    };

    private static List<string> SplitTerms(string? terms) =>
        string.IsNullOrWhiteSpace(terms)
            ? new List<string>()
            : terms.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    private static string FullName(ApplicationUser? user) =>
        user == null ? string.Empty : $"{user.FirstName} {user.LastName}".Trim();

    private async Task<AdminNeedItem> GetAdminNeedAsync(int needId) =>
        (await LoadAdminNeedItemsAsync(new List<int> { needId })).First();

    public async Task<AdminNeedItem> ApproveNeedAsync(int needId, string adminId)
    {
        var need = await _context.Needs.Include(n => n.User).FirstOrDefaultAsync(n => n.Id == needId)
                   ?? throw new NotFoundException("İlan bulunamadı.");

        if (need.Status != NeedStatus.PendingReview && need.Status != NeedStatus.Rejected)
        {
            throw new BusinessException("Yalnızca incelemedeki veya reddedilmiş ilanlar onaylanabilir.");
        }

        var now = DateTime.UtcNow;

        // The requested duration starts at the first approval, not at creation.
        if (need.ApprovedAt == null && need.ExpiresAt.HasValue)
        {
            need.ExpiresAt = need.ExpiresAt.Value + (now - need.CreatedAt);
        }

        need.Status = NeedStatus.Active;
        need.NeedsReview = false;
        need.ApprovedAt = now;
        need.ReviewedAt = now;
        need.ReviewedById = adminId;
        need.RejectionReason = null;
        need.RejectionNote = null;
        await _context.SaveChangesAsync();

        await NotifyOwnerAsync(need, "need_approved",
            "İlanınız yayında",
            $"\"{need.Title}\" ilanınız onaylandı ve yayına alındı.",
            $"\"{need.Title}\" başlıklı ilanınız incelendi ve yayına alındı. Artık teklif alabilirsiniz.");

        return await GetAdminNeedAsync(needId);
    }

    public async Task<AdminNeedItem> RejectNeedAsync(int needId, NeedRejectionReason reason, string? note, string adminId, bool takeDown)
    {
        note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        if (reason == NeedRejectionReason.Other && note == null)
        {
            throw new ValidationException("Note", "\"Diğer\" seçildiğinde açıklama zorunludur.");
        }
        if (note != null && note.Length > 500)
        {
            throw new ValidationException("Note", "Açıklama en fazla 500 karakter olabilir.");
        }

        var need = await _context.Needs.Include(n => n.User).FirstOrDefaultAsync(n => n.Id == needId)
                   ?? throw new NotFoundException("İlan bulunamadı.");

        if (takeDown)
        {
            if (need.Status != NeedStatus.Active && need.Status != NeedStatus.InProgress)
            {
                throw new BusinessException("Yalnızca yayındaki ilanlar yayından kaldırılabilir.");
            }
        }
        else if (need.Status != NeedStatus.PendingReview)
        {
            throw new BusinessException("Yalnızca incelemedeki ilanlar reddedilebilir.");
        }

        var now = DateTime.UtcNow;
        need.Status = NeedStatus.Rejected;
        need.NeedsReview = true;
        need.RejectionReason = reason;
        need.RejectionNote = note;
        need.ReviewedAt = now;
        need.ReviewedById = adminId;
        await _context.SaveChangesAsync();

        var label = ModerationLabels.For(reason);
        var title = takeDown ? "İlanınız yayından kaldırıldı" : "İlanınız yayınlanmadı";
        var body = $"\"{need.Title}\" — Neden: {label}" + (note != null ? $". {note}" : string.Empty);
        var emailText =
            $"\"{need.Title}\" başlıklı ilanınız " + (takeDown ? "yayından kaldırıldı." : "yayınlanmadı.") + "\n" +
            $"Neden: {label}\n" +
            (note != null ? $"Açıklama: {note}\n" : string.Empty) +
            "İlanınızı düzenleyip tekrar incelemeye gönderebilirsiniz.";

        await NotifyOwnerAsync(need, takeDown ? "need_taken_down" : "need_rejected", title, body, emailText);

        return await GetAdminNeedAsync(needId);
    }

    private async Task NotifyOwnerAsync(Need need, string type, string title, string body, string emailText)
    {
        try
        {
            _context.Notifications.Add(new Notification
            {
                UserId = need.UserId,
                Title = title.Length > 200 ? title[..200] : title,
                Body = body.Length > 500 ? body[..497] + "..." : body,
                Type = type,
                Data = JsonSerializer.Serialize(new { type, needId = need.Id }),
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to store moderation notification for need {NeedId}", need.Id);
        }

        var user = need.User ?? await _context.Users.FindAsync(need.UserId);
        if (user == null || user.IsGuest || string.IsNullOrEmpty(user.Email) || user.Email.EndsWith(".arayanibul.local", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var webBase = (_configuration["App:WebBaseUrl"] ?? string.Empty).TrimEnd('/');
        var link = string.IsNullOrEmpty(webBase) ? null : $"{webBase}/my-needs";
        var greeting = string.IsNullOrWhiteSpace(user.FirstName) ? "Merhaba," : $"Merhaba {user.FirstName},";
        var text = $"{greeting}\n\n{emailText}\n" + (link != null ? $"\nİlanlarım: {link}\n" : string.Empty) + "\nArayanibul";
        var html = "<div style=\"font-family:Arial,sans-serif;font-size:15px;line-height:1.5\">" +
                   string.Join("", text.Split('\n').Select(l => $"{WebUtility.HtmlEncode(l)}<br>")) +
                   "</div>";

        await _emailService.SendEmailAsync(user.Email, $"Arayanibul: {title}", html, text);
    }

    // ---------------- Reports ----------------

    public async Task<PagedResult<AdminReportItem>> GetReportsAsync(ReportStatus? status, int page, int pageSize)
    {
        (page, pageSize) = NormalizePaging(page, pageSize);

        var query = _context.Reports.AsNoTracking().AsQueryable();
        if (status.HasValue)
        {
            query = query.Where(r => r.Status == status.Value);
        }

        var totalCount = await query.CountAsync();
        var reports = await query
            .Include(r => r.Reporter)
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = new List<AdminReportItem>();
        foreach (var r in reports)
        {
            items.Add(new AdminReportItem
            {
                Id = r.Id,
                TargetType = r.TargetType,
                TargetId = r.TargetId,
                Reason = r.Reason,
                ReasonText = ModerationLabels.For(r.Reason),
                Note = r.Note,
                Status = r.Status,
                CreatedAt = r.CreatedAt,
                Reporter = new AdminReportReporter { Id = r.ReporterId, FullName = FullName(r.Reporter) },
                Target = await LoadReportTargetAsync(r.TargetType, r.TargetId),
                ResolvedAt = r.ResolvedAt,
                ResolutionNote = r.ResolutionNote
            });
        }

        return new PagedResult<AdminReportItem> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }

    private async Task<AdminReportTarget> LoadReportTargetAsync(ReportTargetType type, string targetId)
    {
        var target = new AdminReportTarget();
        switch (type)
        {
            case ReportTargetType.Need when int.TryParse(targetId, out var needId):
                var need = await _context.Needs.AsNoTracking().Include(n => n.User).FirstOrDefaultAsync(n => n.Id == needId);
                if (need != null)
                {
                    target.Title = need.Title;
                    target.Content = need.Description;
                    target.UserId = need.UserId;
                    target.UserName = FullName(need.User);
                    target.NeedId = need.Id;
                }
                break;
            case ReportTargetType.Message when int.TryParse(targetId, out var messageId):
                var message = await _context.Messages.AsNoTracking()
                    .Include(m => m.Sender)
                    .Include(m => m.Offer).ThenInclude(o => o.Need)
                    .FirstOrDefaultAsync(m => m.Id == messageId);
                if (message != null)
                {
                    target.Title = message.Offer?.Need?.Title;
                    target.Content = message.Content;
                    target.UserId = message.SenderId;
                    target.UserName = FullName(message.Sender);
                    target.OfferId = message.OfferId;
                    target.NeedId = message.Offer?.NeedId;
                }
                break;
            case ReportTargetType.User:
                var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == targetId);
                if (user != null)
                {
                    target.UserId = user.Id;
                    target.UserName = FullName(user);
                }
                break;
        }
        return target;
    }

    public async Task<AdminReportItem> ResolveReportAsync(int reportId, ReportResolutionAction action, string? note, string adminId)
    {
        note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        var report = await _context.Reports.FirstOrDefaultAsync(r => r.Id == reportId)
                     ?? throw new NotFoundException("Şikayet bulunamadı.");

        if (report.Status != ReportStatus.Open)
        {
            throw new BusinessException("Bu şikayet zaten sonuçlandırılmış.");
        }

        switch (action)
        {
            case ReportResolutionAction.TakeDownNeed:
            {
                if (report.TargetType != ReportTargetType.Need || !int.TryParse(report.TargetId, out var needId))
                {
                    throw new BusinessException("Bu işlem yalnızca ilan şikayetleri için kullanılabilir.");
                }
                var need = await _context.Needs.AsNoTracking().FirstOrDefaultAsync(n => n.Id == needId)
                           ?? throw new NotFoundException("İlan bulunamadı.");
                if (need.Status == NeedStatus.Active || need.Status == NeedStatus.InProgress)
                {
                    await RejectNeedAsync(needId, NeedRejectionReason.Other,
                        note ?? $"Şikayet üzerine yayından kaldırıldı ({ModerationLabels.For(report.Reason)}).",
                        adminId, takeDown: true);
                }
                break;
            }
            case ReportResolutionAction.SuspendUser:
            {
                var userId = report.TargetUserId;
                if (string.IsNullOrEmpty(userId))
                {
                    throw new BusinessException("Şikayet edilen kullanıcı bulunamadı.");
                }
                await SuspendUserAsync(userId, note ?? $"Şikayet: {ModerationLabels.For(report.Reason)}", adminId);
                break;
            }
        }

        // Close every open report about the same target with the same outcome.
        var status = action == ReportResolutionAction.Dismiss ? ReportStatus.Dismissed : ReportStatus.Resolved;
        var now = DateTime.UtcNow;
        var related = await _context.Reports
            .Where(r => r.Status == ReportStatus.Open && r.TargetType == report.TargetType && r.TargetId == report.TargetId)
            .ToListAsync();
        foreach (var r in related)
        {
            r.Status = status;
            r.ResolvedAt = now;
            r.ResolvedById = adminId;
            r.ResolutionNote = note;
        }
        await _context.SaveChangesAsync();

        var reloaded = await _context.Reports.AsNoTracking().Include(r => r.Reporter).FirstAsync(r => r.Id == reportId);
        return new AdminReportItem
        {
            Id = reloaded.Id,
            TargetType = reloaded.TargetType,
            TargetId = reloaded.TargetId,
            Reason = reloaded.Reason,
            ReasonText = ModerationLabels.For(reloaded.Reason),
            Note = reloaded.Note,
            Status = reloaded.Status,
            CreatedAt = reloaded.CreatedAt,
            Reporter = new AdminReportReporter { Id = reloaded.ReporterId, FullName = FullName(reloaded.Reporter) },
            Target = await LoadReportTargetAsync(reloaded.TargetType, reloaded.TargetId),
            ResolvedAt = reloaded.ResolvedAt,
            ResolutionNote = reloaded.ResolutionNote
        };
    }

    // ---------------- Users ----------------

    public async Task<PagedResult<AdminUserItem>> GetUsersAsync(string? search, bool suspendedOnly, int page, int pageSize)
    {
        (page, pageSize) = NormalizePaging(page, pageSize);

        var query = _context.Users.AsNoTracking().Where(u => !u.IsGuest);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(u =>
                (u.Email != null && EF.Functions.ILike(u.Email, term)) ||
                EF.Functions.ILike(u.FirstName + " " + u.LastName, term));
        }
        if (suspendedOnly)
        {
            query = query.Where(u => u.SuspendedAt != null);
        }

        var totalCount = await query.CountAsync();
        var rows = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                User = u,
                TotalNeeds = _context.Needs.Count(n => n.UserId == u.Id),
                RejectedNeeds = _context.Needs.Count(n => n.UserId == u.Id && n.Status == NeedStatus.Rejected),
                ReportCount = _context.Reports.Count(r => r.TargetUserId == u.Id)
            })
            .ToListAsync();

        var userIds = rows.Select(r => r.User.Id).ToList();
        var roles = await (from ur in _context.UserRoles
                           join r in _context.Roles on ur.RoleId equals r.Id
                           where userIds.Contains(ur.UserId)
                           select new { ur.UserId, r.Name })
            .ToListAsync();

        var items = rows.Select(r => new AdminUserItem
        {
            Id = r.User.Id,
            FullName = FullName(r.User),
            Email = r.User.Email ?? string.Empty,
            CreatedAt = r.User.CreatedAt,
            IsSuspended = r.User.SuspendedAt != null,
            SuspendedReason = r.User.SuspendedReason,
            TotalNeeds = r.TotalNeeds,
            RejectedNeeds = r.RejectedNeeds,
            ReportCount = r.ReportCount,
            Roles = roles.Where(x => x.UserId == r.User.Id && x.Name != null).Select(x => x.Name!).ToList()
        }).ToList();

        return new PagedResult<AdminUserItem> { Items = items, TotalCount = totalCount, Page = page, PageSize = pageSize };
    }

    public async Task SuspendUserAsync(string userId, string reason, string adminId)
    {
        reason = (reason ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(reason))
        {
            throw new ValidationException("Reason", "Askıya alma nedeni zorunludur.");
        }
        if (reason.Length > 500) reason = reason[..500];

        if (userId == adminId)
        {
            throw new BusinessException("Kendi hesabınızı askıya alamazsınız.");
        }

        var user = await _userManager.FindByIdAsync(userId) ?? throw new NotFoundException("Kullanıcı bulunamadı.");
        if (await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            throw new BusinessException("Yönetici hesapları askıya alınamaz.");
        }

        user.SuspendedAt = DateTime.UtcNow;
        user.SuspendedReason = reason;
        user.LockoutEnabled = true;
        user.LockoutEnd = DateTimeOffset.MaxValue;
        user.UpdatedAt = DateTime.UtcNow;
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            throw new BusinessException("Kullanıcı askıya alınamadı.");
        }

        var tokens = await _context.RefreshTokens.Where(t => t.UserId == userId && !t.IsRevoked).ToListAsync();
        foreach (var token in tokens) token.IsRevoked = true;

        var needs = await _context.Needs
            .Where(n => n.UserId == userId && (n.Status == NeedStatus.Active || n.Status == NeedStatus.PendingReview))
            .ToListAsync();
        foreach (var need in needs)
        {
            need.Status = NeedStatus.Cancelled;
            need.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        _cache.Remove(AuthCacheKeys.UserActive(userId));
        _logger.LogWarning("User {UserId} suspended by admin {AdminId}", userId, adminId);
    }

    public async Task UnsuspendUserAsync(string userId, string adminId)
    {
        var user = await _userManager.FindByIdAsync(userId) ?? throw new NotFoundException("Kullanıcı bulunamadı.");
        if (user.SuspendedAt == null)
        {
            throw new BusinessException("Kullanıcı askıya alınmış değil.");
        }

        user.SuspendedAt = null;
        user.SuspendedReason = null;
        user.LockoutEnd = null;
        user.AccessFailedCount = 0;
        user.UpdatedAt = DateTime.UtcNow;
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            throw new BusinessException("Kullanıcının askısı kaldırılamadı.");
        }

        _cache.Remove(AuthCacheKeys.UserActive(userId));
        _logger.LogWarning("User {UserId} unsuspended by admin {AdminId}", userId, adminId);
    }
}
