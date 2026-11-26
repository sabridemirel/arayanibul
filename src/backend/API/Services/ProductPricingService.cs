using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using API.Data;
using API.Interfaces;
using API.Middleware;
using API.Models;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

/// <summary>
/// "Gerçek Fiyat": for a catalogued product, the price page shows the highest price a buyer is
/// offering right now. Buyers name a price (one listing per product), sellers accept the top price
/// with one tap. Listings and offers stay ordinary Need / Offer rows; this service only adds the
/// product-specific rules around them.
/// </summary>
public class ProductPricingService : IProductPricingService
{
    private const int MaxSeekersShown = 20;
    private const int MaxDealsShown = 3;
    private const int MaxSearchResults = 8;
    private static readonly CultureInfo Turkish = CultureInfo.GetCultureInfo("tr-TR");
    private static readonly TimeSpan RegexTimeout = TimeSpan.FromMilliseconds(250);

    private readonly ApplicationDbContext _context;
    private readonly IOfferService _offerService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ProductPricingService> _logger;

    public ProductPricingService(
        ApplicationDbContext context,
        IOfferService offerService,
        IConfiguration configuration,
        ILogger<ProductPricingService> logger)
    {
        _context = context;
        _offerService = offerService;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>How long a product listing stays live before the buyer has to renew it.</summary>
    private int ListingDays => _configuration.GetValue("ProductPricing:ListingDays", 14);

    /// <summary>How long a buyer has to answer an at-price offer before their listing closes.</summary>
    private int ResponseDays => _configuration.GetValue("ProductPricing:ResponseDays", 7);

    /// <summary>Used when a product has no ceiling of its own yet.</summary>
    /// <summary>Days a fixed-price listing may sit without any offer before the buyer is told.</summary>
    private int NudgeDays => _configuration.GetValue("FixedPrice:NudgeDays", 3);
    private decimal DefaultCeiling => _configuration.GetValue("ProductPricing:DefaultCeilingPrice", 250_000m);

    // ------------------------------------------------------------ recognising products

    public async Task<Product?> FindProductInTextAsync(string text)
    {
        var folded = NeedDraftService.Fold(text);
        var products = await _context.Products.AsNoTracking().Where(p => p.IsActive).ToListAsync();

        // "3080 ti" has to win over "3080": the longest alias present in the text decides.
        return products
            .SelectMany(product => product.Aliases
                .Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(alias => (product, alias)))
            .OrderByDescending(pair => pair.alias.Length)
            .FirstOrDefault(pair => ContainsAlias(folded, pair.alias))
            .product;
    }

    private static bool ContainsAlias(string folded, string alias)
    {
        // Spaces inside an alias are optional in the text ("rtx3080", "rtx 3080").
        var pattern = string.Join(@"\s*", alias.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(Regex.Escape));
        return Regex.IsMatch(folded, $@"(?<![a-z0-9]){pattern}(?![a-z0-9])", RegexOptions.None, RegexTimeout);
    }

    /// <summary>
    /// With a query: the matching products, priced or not. Without one: the home page strip, which
    /// only lists products a buyer has named a price for (most sought first) and is empty until then.
    /// </summary>
    public async Task<List<ProductSummary>> SearchAsync(string? query)
    {
        var folded = NeedDraftService.Fold(query ?? string.Empty).Trim();
        var products = await _context.Products.AsNoTracking()
            .Include(p => p.Category)
            .Where(p => p.IsActive)
            .OrderBy(p => p.SortOrder).ThenBy(p => p.Name)
            .ToListAsync();

        if (folded.Length == 0)
        {
            var now = DateTime.UtcNow;
            var live = await _context.Needs.AsNoTracking()
                .Where(n => n.ProductId != null && n.Status == NeedStatus.Active &&
                            (n.ExpiresAt == null || n.ExpiresAt > now))
                .ToListAsync();
            var byProduct = live.GroupBy(n => n.ProductId!.Value).ToDictionary(g => g.Key, g => g.ToList());

            return products
                .Where(p => byProduct.ContainsKey(p.Id))
                .Select(p => ToSummary(p, byProduct[p.Id]))
                .Where(summary => summary.RealPrice != null)
                .OrderByDescending(summary => summary.SeekerCount)
                .ThenByDescending(summary => summary.RealPrice)
                .Take(MaxSearchResults)
                .ToList();
        }

        var matches = products.Where(p =>
            NeedDraftService.Fold(p.Name).Contains(folded) ||
            p.Aliases.Split('|').Any(alias => alias.Contains(folded) || ContainsAlias(folded, alias.Trim()))).ToList();

        var result = new List<ProductSummary>();
        foreach (var product in matches.Take(MaxSearchResults))
        {
            var listings = await LiveListings(product.Id).ToListAsync();
            result.Add(ToSummary(product, listings));
        }
        return result;
    }

    // ------------------------------------------------------------ the price page

    public async Task<ProductPageResponse?> GetPageAsync(string slug, string? userId)
    {
        var product = await _context.Products.AsNoTracking()
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive);
        return product == null ? null : await BuildPageAsync(product, userId);
    }

    private IQueryable<Need> LiveListings(int productId)
    {
        var now = DateTime.UtcNow;
        return _context.Needs.Where(n =>
            n.ProductId == productId && n.Status == NeedStatus.Active &&
            (n.ExpiresAt == null || n.ExpiresAt > now));
    }

    /// <summary>Priced listings first, highest price first; among equal prices the earlier one leads.</summary>
    private static List<Need> Ranked(IEnumerable<Need> listings)
        => listings
            .OrderByDescending(n => n.MaxBudget ?? 0)
            .ThenBy(n => n.CreatedAt)
            .ThenBy(n => n.Id)
            .ToList();

    private static ProductSummary ToSummary(Product product, List<Need> listings) => new()
    {
        Id = product.Id,
        Name = product.Name,
        Slug = product.Slug,
        CategoryName = string.IsNullOrWhiteSpace(product.Category?.NameTr) ? product.Category?.Name : product.Category.NameTr,
        RealPrice = listings.Where(n => n.MaxBudget > 0).Max(n => n.MaxBudget),
        SeekerCount = listings.Count
    };

    private async Task<ProductPageResponse> BuildPageAsync(Product product, string? userId)
    {
        var listings = Ranked(await LiveListings(product.Id).AsNoTracking().ToListAsync());
        var listingIds = listings.Select(n => n.Id).ToList();

        var pendingAtPrice = await _context.Offers.AsNoTracking()
            .Where(o => listingIds.Contains(o.NeedId) && o.AtListedPrice && o.Status == OfferStatus.Pending)
            .Select(o => new { o.NeedId, o.ProviderId })
            .ToListAsync();
        var awaiting = pendingAtPrice.Select(o => o.NeedId).ToHashSet();

        var deals = await _context.Offers.AsNoTracking()
            .Where(o => o.Need.ProductId == product.Id && o.Status == OfferStatus.Accepted)
            .OrderByDescending(o => o.UpdatedAt)
            .Take(MaxDealsShown)
            .Select(o => new ProductDeal { Price = o.Price, AgreedAt = o.UpdatedAt })
            .ToListAsync();

        var summary = ToSummary(product, listings);
        var page = new ProductPageResponse
        {
            Id = summary.Id,
            Name = summary.Name,
            Slug = summary.Slug,
            CategoryName = summary.CategoryName,
            RealPrice = summary.RealPrice,
            SeekerCount = summary.SeekerCount,
            RecentDeals = deals,
            ResponseDays = ResponseDays,
            ListingDays = ListingDays,
            Seekers = listings.Take(MaxSeekersShown).Select(n => new ProductSeeker
            {
                NeedId = n.Id,
                Price = n.MaxBudget > 0 ? n.MaxBudget : null,
                Address = n.Address,
                CreatedAt = n.CreatedAt,
                AwaitingBuyerResponse = awaiting.Contains(n.Id)
            }).ToList()
        };

        var ceiling = product.CeilingPrice ?? DefaultCeiling;
        if (page.RealPrice is decimal top)
        {
            var suggestions = new List<decimal> { top, top + StepFor(top) };
            if (deals.Count > 0) suggestions.Add(deals[0].Price);
            page.SuggestedPrices = suggestions.Where(price => price > 0 && price <= ceiling).Distinct().OrderBy(p => p).ToList();
        }
        else if (deals.Count > 0 && deals[0].Price <= ceiling)
        {
            page.SuggestedPrices = new List<decimal> { deals[0].Price };
        }

        if (!string.IsNullOrEmpty(userId))
        {
            page.MyListing = BuildMyListing(listings, userId, ceiling);
            page.SellTarget = await FindSellTargetAsync(listings, userId, pendingAtPrice.Where(o => o.ProviderId == userId).Select(o => o.NeedId).ToHashSet());
        }

        return page;
    }

    /// <summary>The smallest raise worth making: about 2.5% of the price, in whole hundreds.</summary>
    public static decimal StepFor(decimal price)
        => Math.Max(100m, Math.Ceiling(price * 0.025m / 100m) * 100m);

    private static ProductMyListing? BuildMyListing(List<Need> ranked, string userId, decimal ceiling)
    {
        var mine = ranked.FirstOrDefault(n => n.UserId == userId);
        if (mine == null) return null;

        var result = new ProductMyListing
        {
            NeedId = mine.Id,
            Price = mine.MaxBudget > 0 ? mine.MaxBudget : null,
            ExpiresAt = mine.ExpiresAt
        };

        var priced = ranked.Where(n => n.MaxBudget > 0).ToList();
        if (result.Price == null)
        {
            return result;
        }

        result.Rank = priced.FindIndex(n => n.Id == mine.Id) + 1;
        if (result.Rank > 1)
        {
            var top = priced[0].MaxBudget!.Value;
            var lead = top + StepFor(top);
            result.PriceToLead = lead <= ceiling ? lead : null;
        }
        return result;
    }

    // ------------------------------------------------------------ buyer: "ben de arıyorum"

    public async Task<ProductBidResponse> PlaceBidAsync(string slug, string userId, ProductBidRequest request)
    {
        var product = await _context.Products.Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive)
            ?? throw new NotFoundException("Ürün bulunamadı.");

        var ceiling = product.CeilingPrice ?? DefaultCeiling;
        if (request.Price > ceiling)
        {
            throw new BusinessException(
                $"Bu ürün için en fazla {ceiling.ToString("N0", Turkish)} TL fiyat verilebilir.");
        }

        var now = DateTime.UtcNow;
        var address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();

        // One listing per buyer per product: naming a new price updates it, and renews it.
        var need = await _context.Needs
            .Where(n => n.ProductId == product.Id && n.UserId == userId &&
                        (n.Status == NeedStatus.Active || n.Status == NeedStatus.Expired))
            .OrderByDescending(n => n.Status == NeedStatus.Active)
            .ThenByDescending(n => n.Id)
            .FirstOrDefaultAsync();

        if (need == null)
        {
            need = new Need
            {
                Title = $"{product.Name} arıyorum",
                Description = $"Çalışır durumda, temiz bir {product.Name} arıyorum. Ürünün durumu ve teslimat için mesajlaşabiliriz.",
                CategoryId = product.CategoryId,
                ProductId = product.Id,
                Currency = "TRY",
                Urgency = UrgencyLevel.Normal,
                UserId = userId,
                Status = NeedStatus.Active,
                // The text is ours, so there is nothing for moderation to review.
                NeedsReview = false,
                ApprovedAt = now,
                CreatedAt = now
            };
            _context.Needs.Add(need);
        }
        else if (need.Status == NeedStatus.Expired)
        {
            need.Status = NeedStatus.Active;
        }

        var raised = need.IsFixedPrice && request.Price > need.MaxBudget;
        need.MaxBudget = request.Price;
        need.MinBudget = null;
        need.IsFixedPrice = request.Price > 0;
        need.PriceNudgeSentAt = null;
        if (address != null) need.Address = address;
        need.ExpiresAt = now.AddDays(ListingDays);
        need.UpdatedAt = now;

        await _context.SaveChangesAsync();
        if (raised)
        {
            await NeedService.NotifyPriceWatchersAsync(_context, need, openedToOffers: false);
        }

        return new ProductBidResponse { NeedId = need.Id, Page = await BuildPageAsync(product, userId) };
    }

    // ------------------------------------------------------------ seller: "bu fiyata satarım"

    private async Task<ProductSellTarget?> FindSellTargetAsync(List<Need> ranked, string sellerId, HashSet<int> alreadyOffered)
    {
        var priced = ranked.Where(n => n.MaxBudget > 0).ToList();
        if (priced.Count == 0) return null;

        var ownerIds = priced.Select(n => n.UserId).Distinct().ToList();
        var blockedOwners = await _context.UserBlocks.AsNoTracking()
            .Where(b => (b.BlockerId == sellerId && ownerIds.Contains(b.BlockedId)) ||
                        (b.BlockedId == sellerId && ownerIds.Contains(b.BlockerId)))
            .Select(b => b.BlockerId == sellerId ? b.BlockedId : b.BlockerId)
            .ToListAsync();

        // The seller's own listing, anyone they are blocked with, and listings they already have a
        // pending offer on are skipped: the next best price is offered instead.
        var target = priced.FirstOrDefault(n =>
            n.UserId != sellerId && !blockedOwners.Contains(n.UserId) && !alreadyOffered.Contains(n.Id));
        if (target == null) return null;

        return new ProductSellTarget
        {
            NeedId = target.Id,
            Price = target.MaxBudget!.Value,
            IsTopPrice = target.Id == priced[0].Id
        };
    }

    public async Task<ProductSellResponse> SellAtRealPriceAsync(string slug, string sellerId)
    {
        var product = await _context.Products.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive)
            ?? throw new NotFoundException("Ürün bulunamadı.");

        var listings = Ranked(await LiveListings(product.Id).AsNoTracking().ToListAsync());
        var listingIds = listings.Select(n => n.Id).ToList();
        var alreadyOffered = (await _context.Offers.AsNoTracking()
            .Where(o => listingIds.Contains(o.NeedId) && o.ProviderId == sellerId && o.Status == OfferStatus.Pending)
            .Select(o => o.NeedId)
            .ToListAsync()).ToHashSet();

        var target = await FindSellTargetAsync(listings, sellerId, alreadyOffered)
            ?? throw new BusinessException("Şu an bu ürüne fiyat veren başka bir alıcı yok.");

        var offer = await _offerService.CreateAtListedPriceOfferAsync(target.NeedId, sellerId);

        return new ProductSellResponse { OfferId = offer.Id, NeedId = target.NeedId, Price = target.Price };
    }

    // ------------------------------------------------------------ housekeeping

    public async Task<int> CloseStaleListingsAsync()
    {
        var now = DateTime.UtcNow;
        var closed = 0;

        // 1) Buyers who did not answer an at-price offer in time lose their place: the price moves
        //    on to the next buyer and the seller is free to try them.
        var deadline = now.AddDays(-ResponseDays);
        var unanswered = await _context.Offers
            .Include(o => o.Need)
            .Where(o => o.AtListedPrice && o.Status == OfferStatus.Pending && o.CreatedAt <= deadline &&
                        (o.Need.ProductId != null || o.Need.IsFixedPrice) && o.Need.Status == NeedStatus.Active)
            .ToListAsync();

        foreach (var group in unanswered.GroupBy(o => o.NeedId))
        {
            var need = group.First().Need;
            need.Status = NeedStatus.Expired;
            need.UpdatedAt = now;
            closed++;

            foreach (var offer in group)
            {
                offer.Status = OfferStatus.Rejected;
                offer.UpdatedAt = now;
                AddNotification(offer.ProviderId, "offer_unanswered",
                    "Alıcı yanıt vermedi",
                    $"\"{need.Title}\" ilanının sahibi {ResponseDays} gün içinde yanıt vermediği için ilan kapandı." +
                    (need.ProductId != null ? " Fiyat sayfasından sıradaki alıcıya teklif verebilirsiniz." : string.Empty),
                    new { type = "offer_unanswered", needId = need.Id, offerId = offer.Id });
            }

            AddNotification(need.UserId, "need_expired",
                "İlanınız kapandı",
                $"\"{need.Title}\" ilanınıza gelen teklife {ResponseDays} gün içinde yanıt vermediğiniz için ilanınız kapandı. " +
                (need.ProductId != null
                    ? "Hâlâ arıyorsanız fiyat sayfasından yenileyebilirsiniz."
                    : "Hâlâ arıyorsanız İlanlarım'dan yeniden yayınlayabilirsiniz."),
                new { type = "need_expired", needId = need.Id });
        }

        // 2) Product listings past their end date stop counting towards the price. Only listings
        //    that are still live are touched, so the step above and this one never close one twice.
        var alreadyClosed = unanswered.Select(o => o.NeedId).ToHashSet();
        var expired = await _context.Needs
            .Where(n => n.ProductId != null && n.Status == NeedStatus.Active && n.ExpiresAt != null && n.ExpiresAt <= now)
            .ToListAsync();

        foreach (var need in expired.Where(n => !alreadyClosed.Contains(n.Id)))
        {
            need.Status = NeedStatus.Expired;
            need.UpdatedAt = now;
            closed++;
            AddNotification(need.UserId, "need_expired",
                "İlanınızın süresi doldu",
                $"\"{need.Title}\" ilanınız {ListingDays} gün yayında kaldı ve süresi doldu. " +
                "Hâlâ arıyorsanız fiyat sayfasından tek dokunuşla yenileyebilirsiniz.",
                new { type = "need_expired", needId = need.Id });
        }

        // 3) A fixed price nobody has taken for a few days: tell the buyer once, so the listing
        //    does not sit silent. Sellers cannot say "a bit more" on these listings.
        var nudgeBefore = now.AddDays(-NudgeDays);
        var silent = await _context.Needs
            .Include(n => n.PriceWatches)
            .Where(n => n.IsFixedPrice && n.Status == NeedStatus.Active && n.PriceNudgeSentAt == null &&
                        n.UpdatedAt <= nudgeBefore && !n.Offers.Any())
            .ToListAsync();

        foreach (var need in silent)
        {
            need.PriceNudgeSentAt = now;
            var price = (need.MaxBudget ?? 0).ToString("N0", Turkish);
            var watchers = need.PriceWatches.Count;
            AddNotification(need.UserId, "price_nudge",
                "Bu fiyata satan çıkmadı",
                $"\"{need.Title}\" ilanınıza {price} TL fiyatla henüz teklif gelmedi." +
                (watchers > 0 ? $" {watchers} satıcı fiyat artarsa haber bekliyor." : string.Empty) +
                " Fiyatı artırabilir ya da ilanı pazarlığa açabilirsiniz.",
                new { type = "price_nudge", needId = need.Id });
        }

        if (closed > 0 || silent.Count > 0)
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Closed {Count} stale listing(s), nudged {Nudged} silent fixed-price listing(s)", closed, silent.Count);
        }
        return closed;
    }

    private void AddNotification(string userId, string type, string title, string body, object data)
        => _context.Notifications.Add(new Notification
        {
            UserId = userId,
            Title = title,
            Body = body.Length > 500 ? body[..499] + "…" : body,
            Type = type,
            Data = JsonSerializer.Serialize(data),
            CreatedAt = DateTime.UtcNow
        });

    // ------------------------------------------------------------ rules for edits made elsewhere

    public async Task EnsureEditAllowedAsync(Need need, UpdateNeedRequest request)
    {
        if (need.ProductId == null) return;

        if (request.CategoryId.HasValue && request.CategoryId.Value != need.CategoryId)
        {
            throw new BusinessException("Ürün ilanının kategorisi değiştirilemez.");
        }

        if (request.MaxBudget.HasValue)
        {
            var product = await _context.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == need.ProductId);
            var ceiling = product?.CeilingPrice ?? DefaultCeiling;
            if (request.MaxBudget.Value > ceiling)
            {
                throw new BusinessException(
                    $"Bu ürün için en fazla {ceiling.ToString("N0", Turkish)} TL fiyat verilebilir.");
            }
        }
    }

    public int ListingLifetimeDays => ListingDays;

    public async Task<Product?> FindLinkableProductAsync(string title, decimal price, string userId, int? excludeNeedId = null)
    {
        var product = await FindProductInTextAsync(title);
        if (product == null) return null;

        var ceiling = product.CeilingPrice ?? DefaultCeiling;
        if (price > ceiling)
        {
            throw new BusinessException(
                $"{product.Name} için en fazla {ceiling.ToString("N0", Turkish)} TL fiyat verilebilir.");
        }

        // One listing per buyer per product: a second one stays an ordinary listing.
        var hasListing = await LiveListings(product.Id)
            .AnyAsync(n => n.UserId == userId && (excludeNeedId == null || n.Id != excludeNeedId));
        return hasListing ? null : product;
    }

    // ------------------------------------------------------------ admin

    public async Task<List<Product>> GetAllProductsAsync()
        => await _context.Products.AsNoTracking().OrderBy(p => p.SortOrder).ThenBy(p => p.Name).ToListAsync();

    public async Task<Product> UpdateProductAsync(int productId, AdminProductRequest request)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == productId)
            ?? throw new NotFoundException("Ürün bulunamadı.");
        product.CeilingPrice = request.CeilingPrice;
        product.IsActive = request.IsActive;
        await _context.SaveChangesAsync();
        return product;
    }
}
