using System.Globalization;
using System.Text;
using API.Data;
using API.Interfaces;
using API.Models;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

public class SeoService : ISeoService
{
    /// <summary>sitemap.org limit for a single file.</summary>
    private const int MaxSitemapUrls = 50000;
    private const int MetaDescriptionLength = 160;
    private static readonly CultureInfo Turkish = CultureInfo.GetCultureInfo("tr-TR");

    private readonly ApplicationDbContext _context;
    private readonly string _webBaseUrl;
    private readonly string _apiBaseUrl;

    public SeoService(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _webBaseUrl = (configuration["App:WebBaseUrl"] ?? string.Empty).TrimEnd('/');
        _apiBaseUrl = (configuration["BaseUrl"] ?? string.Empty).TrimEnd('/');
    }

    public async Task<string> BuildSitemapAsync()
    {
        var categoryIds = await _context.Categories
            .Where(c => c.IsActive && c.ParentCategoryId == null)
            .OrderBy(c => c.SortOrder)
            .Select(c => c.Id)
            .ToListAsync();

        var needs = await _context.Needs
            .Where(n => n.Status == NeedStatus.Active)
            .OrderByDescending(n => n.UpdatedAt)
            .Select(n => new { n.Id, n.UpdatedAt })
            .Take(MaxSitemapUrls - categoryIds.Count - 10)
            .ToListAsync();

        var xml = new StringBuilder();
        xml.Append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.Append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        var latest = needs.Count > 0 ? needs[0].UpdatedAt : (DateTime?)null;
        AppendUrl(xml, "/", latest);
        AppendUrl(xml, "/needs", latest);
        foreach (var categoryId in categoryIds)
        {
            AppendUrl(xml, $"/needs?categoryId={categoryId}", null);
        }
        foreach (var need in needs)
        {
            AppendUrl(xml, $"/needs/{need.Id}", need.UpdatedAt);
        }
        foreach (var path in new[] { "/contact", "/terms", "/privacy", "/kvkk" })
        {
            AppendUrl(xml, path, null);
        }

        xml.Append("</urlset>\n");
        return xml.ToString();
    }

    public async Task<string?> BuildNeedPageAsync(int needId)
    {
        var need = await _context.Needs
            .AsNoTracking()
            .Include(n => n.Category)
            .Include(n => n.Images.OrderBy(i => i.SortOrder))
            .FirstOrDefaultAsync(n => n.Id == needId && n.Status == NeedStatus.Active);

        if (need == null)
        {
            return null;
        }

        var url = $"{_webBaseUrl}/needs/{need.Id}";
        var categoryName = string.IsNullOrWhiteSpace(need.Category?.NameTr) ? need.Category?.Name : need.Category.NameTr;
        var budget = FormatBudget(need);

        var title = $"{need.Title} | Arayanibul";
        var summaryParts = new[] { categoryName, need.Address, budget == null ? null : $"Bütçe: {budget}" }
            .Where(part => !string.IsNullOrWhiteSpace(part));
        var description = Truncate(
            $"{string.Join(" · ", summaryParts)}. {CollapseWhitespace(need.Description)}".TrimStart('.', ' '),
            MetaDescriptionLength);

        var firstImage = need.Images.FirstOrDefault()?.ImageUrl;
        var imageUrl = string.IsNullOrWhiteSpace(firstImage)
            ? $"{_webBaseUrl}/assets/mascot.png"
            : ToAbsoluteMediaUrl(firstImage);

        var html = new StringBuilder();
        html.Append("<!doctype html>\n<html lang=\"tr\">\n<head>\n");
        html.Append("<meta charset=\"UTF-8\" />\n");
        html.Append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n");
        html.Append($"<title>{E(title)}</title>\n");
        html.Append($"<meta name=\"description\" content=\"{E(description)}\" />\n");
        html.Append($"<link rel=\"canonical\" href=\"{E(url)}\" />\n");
        html.Append("<meta property=\"og:type\" content=\"website\" />\n");
        html.Append("<meta property=\"og:site_name\" content=\"Arayanibul\" />\n");
        html.Append("<meta property=\"og:locale\" content=\"tr_TR\" />\n");
        html.Append($"<meta property=\"og:title\" content=\"{E(need.Title)}\" />\n");
        html.Append($"<meta property=\"og:description\" content=\"{E(description)}\" />\n");
        html.Append($"<meta property=\"og:url\" content=\"{E(url)}\" />\n");
        html.Append($"<meta property=\"og:image\" content=\"{E(imageUrl)}\" />\n");
        html.Append("<meta name=\"twitter:card\" content=\"summary\" />\n");
        html.Append("</head>\n<body>\n<main>\n");
        if (!string.IsNullOrWhiteSpace(categoryName))
        {
            html.Append($"<p>{E(categoryName)}</p>\n");
        }
        html.Append($"<h1>{E(need.Title)}</h1>\n");
        html.Append($"<p>{E(need.Description).Replace("\n", "<br />")}</p>\n");
        html.Append("<ul>\n");
        html.Append($"<li>Bütçe: {E(budget ?? "Belirtilmemiş")}</li>\n");
        if (!string.IsNullOrWhiteSpace(need.Address))
        {
            html.Append($"<li>Konum: {E(need.Address)}</li>\n");
        }
        html.Append($"<li>İlan tarihi: {need.CreatedAt.ToString("d MMMM yyyy", Turkish)}</li>\n");
        html.Append("</ul>\n");
        foreach (var image in need.Images)
        {
            html.Append($"<img src=\"{E(ToAbsoluteMediaUrl(image.ImageUrl))}\" alt=\"{E(need.Title)}\" />\n");
        }
        html.Append($"<p><a href=\"{E(url)}\">Bu ilana teklif verin</a></p>\n");
        html.Append($"<p><a href=\"{E(_webBaseUrl)}/needs\">Tüm ilanlar</a></p>\n");
        html.Append("</main>\n</body>\n</html>\n");
        return html.ToString();
    }

    private void AppendUrl(StringBuilder xml, string path, DateTime? lastModified)
    {
        xml.Append("  <url><loc>").Append(E(_webBaseUrl + path)).Append("</loc>");
        if (lastModified.HasValue)
        {
            xml.Append("<lastmod>")
               .Append(lastModified.Value.ToUniversalTime().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture))
               .Append("</lastmod>");
        }
        xml.Append("</url>\n");
    }

    private string ToAbsoluteMediaUrl(string url)
        => url.StartsWith("http", StringComparison.OrdinalIgnoreCase)
            ? url
            : $"{_apiBaseUrl}/{url.TrimStart('/')}";

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

    private static string CollapseWhitespace(string text)
        => string.Join(' ', text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    private static string Truncate(string text, int maxLength)
        => text.Length <= maxLength ? text : text[..(maxLength - 1)].TrimEnd() + "…";

    /// <summary>Escapes text for HTML/XML content and attribute values.</summary>
    private static string E(string text) => text
        .Replace("&", "&amp;")
        .Replace("<", "&lt;")
        .Replace(">", "&gt;")
        .Replace("\"", "&quot;")
        .Replace("'", "&#39;");
}
