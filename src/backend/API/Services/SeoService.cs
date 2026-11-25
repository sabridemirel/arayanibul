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
        var productSlugs = await _context.Products
            .Where(p => p.IsActive)
            .OrderBy(p => p.SortOrder)
            .Select(p => p.Slug)
            .ToListAsync();
        foreach (var slug in productSlugs)
        {
            AppendUrl(xml, $"/fiyat/{slug}", null);
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

    public async Task<string?> BuildProductPageAsync(string slug)
    {
        var product = await _context.Products.AsNoTracking()
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive);
        if (product == null)
        {
            return null;
        }

        var now = DateTime.UtcNow;
        var listings = await _context.Needs.AsNoTracking()
            .Where(n => n.ProductId == product.Id && n.Status == NeedStatus.Active &&
                        (n.ExpiresAt == null || n.ExpiresAt > now))
            .OrderByDescending(n => n.MaxBudget ?? 0).ThenBy(n => n.CreatedAt)
            .Take(20)
            .ToListAsync();
        var seekerCount = await _context.Needs.CountAsync(n =>
            n.ProductId == product.Id && n.Status == NeedStatus.Active && (n.ExpiresAt == null || n.ExpiresAt > now));
        var realPrice = listings.Where(n => n.MaxBudget > 0).Max(n => n.MaxBudget);
        var lastDeal = await _context.Offers.AsNoTracking()
            .Where(o => o.Need.ProductId == product.Id && o.Status == OfferStatus.Accepted)
            .OrderByDescending(o => o.UpdatedAt)
            .Select(o => (decimal?)o.Price)
            .FirstOrDefaultAsync();

        string Tl(decimal value) => $"{value.ToString("N0", Turkish)} TL";
        var url = $"{_webBaseUrl}/fiyat/{product.Slug}";
        var title = realPrice.HasValue
            ? $"{product.Name} ikinci el fiyatı: {Tl(realPrice.Value)} veren var | Arayanibul"
            : $"{product.Name} ikinci el gerçek fiyatı | Arayanibul";
        var description = realPrice.HasValue
            ? $"{product.Name} için şu an {Tl(realPrice.Value)} veren alıcı var, {seekerCount} kişi arıyor. Elinizde varsa tek dokunuşla bu fiyata satın; arıyorsanız kendi fiyatınızı verin."
            : $"{product.Name} için henüz fiyat oluşmadı. İlk fiyatı siz verin; elinde olan satıcılar size ulaşsın.";
        var shareTitle = realPrice.HasValue
            ? $"{product.Name}'e {Tl(realPrice.Value)} veren var"
            : $"{product.Name} arayanlar burada";

        var html = new StringBuilder();
        html.Append("<!doctype html>\n<html lang=\"tr\">\n<head>\n");
        html.Append("<meta charset=\"UTF-8\" />\n");
        html.Append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n");
        html.Append($"<title>{E(title)}</title>\n");
        html.Append($"<meta name=\"description\" content=\"{E(Truncate(description, 200))}\" />\n");
        html.Append($"<link rel=\"canonical\" href=\"{E(url)}\" />\n");
        html.Append("<meta property=\"og:type\" content=\"website\" />\n");
        html.Append("<meta property=\"og:site_name\" content=\"Arayanibul\" />\n");
        html.Append("<meta property=\"og:locale\" content=\"tr_TR\" />\n");
        html.Append($"<meta property=\"og:title\" content=\"{E(shareTitle)}\" />\n");
        html.Append($"<meta property=\"og:description\" content=\"{E("Elinde olan dokunsun. Gerçek fiyat yerini bulur.")}\" />\n");
        html.Append($"<meta property=\"og:url\" content=\"{E(url)}\" />\n");
        html.Append($"<meta property=\"og:image\" content=\"{E(_webBaseUrl)}/assets/mascot.png\" />\n");
        html.Append("<meta name=\"twitter:card\" content=\"summary\" />\n");
        html.Append("</head>\n<body>\n<main>\n");
        html.Append($"<h1>{E(product.Name)} ikinci el gerçek fiyatı</h1>\n");
        html.Append(realPrice.HasValue
            ? $"<p>Gerçek fiyat: <strong>{E(Tl(realPrice.Value))}</strong>. Şu an bu fiyata alıcısı var.</p>\n"
            : "<p>Henüz fiyat oluşmadı. İlk fiyatı siz verin.</p>\n");
        html.Append($"<p>{seekerCount} kişi arıyor.");
        if (lastDeal.HasValue)
        {
            html.Append($" Son anlaşılan teklif: {E(Tl(lastDeal.Value))}.");
        }
        html.Append("</p>\n");
        html.Append("<p>Fiyat, çalışır durumdaki temiz ürün içindir ve alıcıların ödemeye hazır olduğu tutarı gösterir.</p>\n");
        if (listings.Count > 0)
        {
            html.Append("<h2>Arayanlar</h2>\n<ul>\n");
            foreach (var listing in listings)
            {
                var price = listing.MaxBudget > 0 ? Tl(listing.MaxBudget.Value) : "Fiyatı satıcılar söylesin";
                var place = string.IsNullOrWhiteSpace(listing.Address) ? "" : $", {listing.Address}";
                html.Append($"<li><a href=\"{E(_webBaseUrl)}/needs/{listing.Id}\">{E(price + place)}</a></li>\n");
            }
            html.Append("</ul>\n");
        }
        html.Append($"<p><a href=\"{E(url)}\">Elimde var, bu fiyata satarım</a></p>\n");
        html.Append($"<p><a href=\"{E(url)}\">Ben de arıyorum</a></p>\n");
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
