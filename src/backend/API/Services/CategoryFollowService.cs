using System.Globalization;
using System.Net;
using System.Text.Json;
using API.Data;
using API.Interfaces;
using API.Middleware;
using API.Models;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

public class CategoryFollowService : ICategoryFollowService
{
    /// <summary>A seller following everything would defeat the point of following.</summary>
    public const int MaxFollowedCategories = 30;

    /// <summary>Listings published longer ago than this are not announced (e.g. after downtime).</summary>
    private static readonly TimeSpan AnnouncementWindow = TimeSpan.FromHours(24);
    private const int MaxNeedsPerPass = 20;
    private static readonly CultureInfo Turkish = CultureInfo.GetCultureInfo("tr-TR");

    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CategoryFollowService> _logger;

    public CategoryFollowService(
        ApplicationDbContext context,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<CategoryFollowService> logger)
    {
        _context = context;
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
    }

    private int MaxEmailsPerDay => _configuration.GetValue("NewNeedAlerts:MaxEmailsPerDay", 5);

    public async Task<CategoryFollowsResponse> GetFollowsAsync(string userId)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        var categoryIds = await _context.CategoryFollows
            .Where(f => f.UserId == userId)
            .OrderBy(f => f.CategoryId)
            .Select(f => f.CategoryId)
            .ToListAsync();

        return new CategoryFollowsResponse
        {
            CategoryIds = categoryIds,
            EmailEnabled = user?.EnableNewNeedEmails ?? true
        };
    }

    public async Task<CategoryFollowsResponse> SetFollowsAsync(string userId, CategoryFollowsRequest request)
    {
        var requested = request.CategoryIds.Distinct().ToList();
        if (requested.Count > MaxFollowedCategories)
        {
            throw new BusinessException($"En fazla {MaxFollowedCategories} kategori takip edebilirsiniz.");
        }

        var valid = await _context.Categories
            .Where(c => c.IsActive && requested.Contains(c.Id))
            .Select(c => c.Id)
            .ToListAsync();

        var existing = await _context.CategoryFollows.Where(f => f.UserId == userId).ToListAsync();

        _context.CategoryFollows.RemoveRange(existing.Where(f => !valid.Contains(f.CategoryId)));
        var alreadyFollowed = existing.Select(f => f.CategoryId).ToHashSet();
        _context.CategoryFollows.AddRange(valid
            .Where(id => !alreadyFollowed.Contains(id))
            .Select(id => new CategoryFollow { UserId = userId, CategoryId = id, CreatedAt = DateTime.UtcNow }));

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user != null)
        {
            user.EnableNewNeedEmails = request.EmailEnabled;
        }

        await _context.SaveChangesAsync();
        return await GetFollowsAsync(userId);
    }

    public async Task<int> NotifyFollowersOfNewNeedsAsync()
    {
        var now = DateTime.UtcNow;
        var since = now - AnnouncementWindow;

        var needs = await _context.Needs
            .Include(n => n.Category)
            .Where(n => n.Status == NeedStatus.Active && n.FollowersNotifiedAt == null &&
                        (n.ApprovedAt ?? n.CreatedAt) >= since)
            .OrderBy(n => n.Id)
            .Take(MaxNeedsPerPass)
            .ToListAsync();

        foreach (var need in needs)
        {
            // Marked first: a failure while notifying must not announce the same listing twice.
            need.FollowersNotifiedAt = now;
            await _context.SaveChangesAsync();

            try
            {
                await NotifyFollowersAsync(need, now);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to notify followers about need {NeedId}", need.Id);
            }
        }

        return needs.Count;
    }

    private async Task NotifyFollowersAsync(Need need, DateTime now)
    {
        var categoryIds = new List<int> { need.CategoryId };
        if (need.Category?.ParentCategoryId is int parentId)
        {
            categoryIds.Add(parentId);
        }

        var followers = await _context.CategoryFollows
            .Where(f => categoryIds.Contains(f.CategoryId) && f.UserId != need.UserId && !f.User.IsGuest)
            // Nobody hears about listings from, or is shown to, someone they have blocked.
            .Where(f => !_context.UserBlocks.Any(b =>
                (b.BlockerId == f.UserId && b.BlockedId == need.UserId) ||
                (b.BlockerId == need.UserId && b.BlockedId == f.UserId)))
            .Select(f => f.User)
            .Distinct()
            .ToListAsync();

        if (followers.Count == 0)
        {
            return;
        }

        var categoryName = string.IsNullOrWhiteSpace(need.Category?.NameTr) ? need.Category?.Name : need.Category.NameTr;
        var summary = string.Join(" · ", new[] { categoryName, FormatBudget(need), need.Address }
            .Where(part => !string.IsNullOrWhiteSpace(part)));
        var title = Truncate($"Yeni ilan: {need.Title}", 200);
        var body = Truncate(string.IsNullOrEmpty(summary) ? "Teklif vermek için ilanı açın." : $"{summary}. Teklif vermek için ilanı açın.", 500);
        var data = JsonSerializer.Serialize(new { type = "new_need", needId = need.Id, categoryId = need.CategoryId });

        _context.Notifications.AddRange(followers.Select(follower => new Notification
        {
            UserId = follower.Id,
            Title = title,
            Body = body,
            Type = "new_need",
            Data = data,
            CreatedAt = now
        }));

        var webBase = (_configuration["App:WebBaseUrl"] ?? string.Empty).TrimEnd('/');
        var today = now.Date;
        var toEmail = new List<ApplicationUser>();
        foreach (var follower in followers)
        {
            if (!follower.EnableNewNeedEmails || !IsDeliverable(follower.Email))
            {
                continue;
            }

            if (follower.NewNeedEmailDay != today)
            {
                follower.NewNeedEmailDay = today;
                follower.NewNeedEmailCount = 0;
            }

            if (follower.NewNeedEmailCount >= MaxEmailsPerDay)
            {
                continue;
            }

            follower.NewNeedEmailCount++;
            toEmail.Add(follower);
        }

        await _context.SaveChangesAsync();

        if (string.IsNullOrEmpty(webBase))
        {
            return;
        }

        foreach (var follower in toEmail)
        {
            var (html, text) = BuildEmail(follower, need, summary, webBase);
            await _emailService.SendEmailAsync(follower.Email!, $"Arayanibul: {title}", html, text);
        }
    }

    private static bool IsDeliverable(string? email)
        => !string.IsNullOrWhiteSpace(email) &&
           !email.EndsWith(".arayanibul.local", StringComparison.OrdinalIgnoreCase);

    private static (string Html, string Text) BuildEmail(ApplicationUser user, Need need, string summary, string webBase)
    {
        var greeting = string.IsNullOrWhiteSpace(user.FirstName) ? "Merhaba," : $"Merhaba {user.FirstName},";
        var needLink = $"{webBase}/needs/{need.Id}";
        var settingsLink = $"{webBase}/profile";
        var lines = new[]
        {
            greeting,
            "",
            "Takip ettiğiniz kategoride yeni bir ilan yayınlandı:",
            "",
            need.Title,
            summary,
            "",
            $"İlanı görün ve teklif verin: {needLink}",
            "Teklif vermek ücretsizdir.",
            "",
            $"Bu e-postaları kapatmak ya da takip ettiğiniz kategorileri değiştirmek için: {settingsLink}",
            "",
            "Arayanibul"
        };
        var text = string.Join("\n", lines);
        var html = "<div style=\"font-family:Arial,sans-serif;font-size:15px;line-height:1.5\">" +
                   string.Join("", lines.Select(line => $"{WebUtility.HtmlEncode(line)}<br>")) +
                   "</div>";
        return (html, text);
    }

    private static string? FormatBudget(Need need)
    {
        var unit = need.Currency == "TRY" ? "TL" : need.Currency;
        string Format(decimal value) => value.ToString("N0", Turkish);

        if (need.MinBudget > 0 && need.MaxBudget > 0)
        {
            return need.MinBudget == need.MaxBudget
                ? $"{Format(need.MaxBudget.Value)} {unit}"
                : $"{Format(need.MinBudget.Value)} – {Format(need.MaxBudget.Value)} {unit}";
        }
        if (need.MaxBudget > 0) return $"En fazla {Format(need.MaxBudget.Value)} {unit}";
        if (need.MinBudget > 0) return $"En az {Format(need.MinBudget.Value)} {unit}";
        return null;
    }

    private static string Truncate(string text, int maxLength)
        => text.Length <= maxLength ? text : text[..(maxLength - 1)] + "…";
}
