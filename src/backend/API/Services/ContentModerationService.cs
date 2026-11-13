using System.Globalization;
using System.Text.RegularExpressions;
using API.Data;
using API.Interfaces;
using API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace API.Services;

public class ContentModerationService : IContentModerationService
{
    private static readonly CultureInfo Tr = new("tr-TR");
    private const string KeywordsCacheKey = "moderation:keywords";

    // Turkish mobile numbers: 05xx xxx xx xx, 5xx xxx xx xx, +90 5xx..., 0090 5xx...
    private static readonly Regex PhoneRegex = new(
        @"(?<!\d)(?:(?:\+|00)\s?90[\s\-.]?)?\(?0?5\d{2}\)?[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2}(?!\d)",
        RegexOptions.Compiled, TimeSpan.FromMilliseconds(250));

    private static readonly Regex EmailRegex = new(
        @"[\p{L}0-9._%+\-]+@[\p{L}0-9.\-]+\.[\p{L}]{2,}",
        RegexOptions.Compiled, TimeSpan.FromMilliseconds(250));

    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;

    public ContentModerationService(ApplicationDbContext context, IMemoryCache cache, IConfiguration configuration)
    {
        _context = context;
        _cache = cache;
        _configuration = configuration;
    }

    public bool IsEnabled => _configuration.GetValue("Moderation:Enabled", true);

    public static string Normalize(string value) => value.Trim().ToLower(Tr);

    public async Task<List<string>> GetKeywordsAsync()
    {
        if (_cache.TryGetValue(KeywordsCacheKey, out List<string>? cached) && cached != null)
        {
            return cached;
        }

        var keywords = await _context.ModerationKeywords
            .AsNoTracking()
            .OrderBy(k => k.Term)
            .Select(k => k.Term)
            .ToListAsync();

        _cache.Set(KeywordsCacheKey, keywords, TimeSpan.FromMinutes(10));
        return keywords;
    }

    public async Task<List<string>> ReplaceKeywordsAsync(IEnumerable<string> keywords)
    {
        var normalized = keywords
            .Where(k => !string.IsNullOrWhiteSpace(k))
            .Select(Normalize)
            .Where(k => k.Length <= 100)
            .Distinct()
            .OrderBy(k => k, StringComparer.Create(Tr, false))
            .ToList();

        _context.ModerationKeywords.RemoveRange(await _context.ModerationKeywords.ToListAsync());
        _context.ModerationKeywords.AddRange(normalized.Select(k => new ModerationKeyword { Term = k }));
        await _context.SaveChangesAsync();

        _cache.Remove(KeywordsCacheKey);
        return normalized;
    }

    public async Task<List<string>> FindFlaggedTermsAsync(string? title, string? description)
    {
        var raw = $"{title} {description}";
        var text = raw.ToLower(Tr);
        var found = new List<string>();

        foreach (var keyword in await GetKeywordsAsync())
        {
            // Match at a word start so Turkish suffixes still match ("silahlar" -> "silah").
            var pattern = @"(?<![\p{L}\p{N}])" + Regex.Escape(keyword);
            try
            {
                if (Regex.IsMatch(text, pattern, RegexOptions.None, TimeSpan.FromMilliseconds(100)))
                {
                    found.Add(keyword);
                }
            }
            catch (RegexMatchTimeoutException)
            {
                // ignore pathological input for this keyword
            }
        }

        try
        {
            found.AddRange(PhoneRegex.Matches(raw).Select(m => m.Value.Trim()));
            found.AddRange(EmailRegex.Matches(raw).Select(m => m.Value.Trim()));
        }
        catch (RegexMatchTimeoutException)
        {
        }

        return found.Distinct().ToList();
    }

    /// <summary>Starter keyword list seeded when the table is empty.</summary>
    public static readonly string[] DefaultKeywords =
    {
        // Yasa dışı / yasaklı ürün ve hizmetler
        "silah", "tabanca", "ruhsatsız", "mermi", "fişek", "uyuşturucu", "esrar", "kokain", "eroin",
        "bonzai", "metamfetamin", "ecstasy", "uyarıcı hap", "reçetesiz ilaç",
        "sahte belge", "sahte diploma", "sahte rapor", "sahte kimlik", "sahte ehliyet", "sahte fatura",
        "kopya", "sınav soruları", "ödev yaptırma", "tez yazdırma",
        "bahis", "kumar", "kaçak bahis", "iddaa kuponu", "casino",
        "eskort", "escort", "fuhuş",
        "çalıntı", "kaçak", "gümrüksüz",
        "hack", "hacker", "şifre kırma", "hesap çalma", "whatsapp hack", "instagram hack",
        "takipçi satın", "beğeni satın", "bot hesap",
        "organ satış", "böbrek satılık",
        "kredi kartı bilgisi", "kart kopyalama",
        // Hakaret / uygunsuz dil (genel, hafif)
        "aptal", "salak", "gerizekalı", "dangalak", "şerefsiz", "haysiyetsiz", "lanet olası"
    };
}
