using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Interfaces;
using API.Models;
using API.Middleware;

namespace API.Services;

public class NeedService : INeedService
{
    private readonly ApplicationDbContext _context;
    private readonly IFileStorageService _fileStorageService;
    private readonly IContentModerationService? _moderation;

    public NeedService(
        ApplicationDbContext context,
        IFileStorageService fileStorageService,
        IContentModerationService? moderation = null,
        IProductPricingService? productPricing = null)
    {
        _context = context;
        _fileStorageService = fileStorageService;
        _moderation = moderation;
        _productPricing = productPricing;
    }

    private readonly IProductPricingService? _productPricing;

    private bool ModerationEnabled => _moderation?.IsEnabled ?? false;

    /// <summary>True when a listing with these flagged terms must wait for an admin before going live.
    /// Clean listings skip the queue when Moderation:AutoApproveClean is on.</summary>
    private bool RequiresReview(string? flaggedTerms)
        => ModerationEnabled && (flaggedTerms != null || !(_moderation?.AutoApproveClean ?? false));

    /// <summary>How long an urgent need stays in the "Acil İlanlar" showcase.</summary>
    public const int UrgentShowcaseDays = 7;
    private const string FixedPriceRequiredMessage = "\"Bu fiyata hemen alırım\" için bir fiyat yazın.";

    /// <summary>A user may hold one showcase slot at a time (the slot is the future paid product).</summary>
    private async Task EnsureUrgentSlotAvailableAsync(string userId, int? excludeNeedId = null)
    {
        var now = DateTime.UtcNow;
        var hasActiveUrgent = await _context.Needs.AnyAsync(n =>
            n.UserId == userId &&
            n.Id != excludeNeedId &&
            n.Urgency == UrgencyLevel.Urgent &&
            n.UrgentUntil > now &&
            // Closed needs free the slot; rejected / in-progress ones still hold it, since they
            // can come back to the listing without their urgency changing.
            n.Status != NeedStatus.Cancelled &&
            n.Status != NeedStatus.Completed &&
            n.Status != NeedStatus.Expired);

        if (hasActiveUrgent)
        {
            // BusinessException: its text reaches clients in "message", which already-released
            // app versions show as-is.
            throw new BusinessException(
                "Aynı anda yalnızca bir acil ilanınız olabilir. Bu ilanı normal olarak yayınlayabilir veya mevcut acil ilanınızın süresinin dolmasını bekleyebilirsiniz.");
        }
    }

    /// <summary>Drops urgent needs whose showcase slot has ended back to Normal.</summary>
    public async Task<int> ExpireUrgentShowcasesAsync()
    {
        var now = DateTime.UtcNow;
        var expired = await _context.Needs
            .Where(n => n.Urgency == UrgencyLevel.Urgent && n.UrgentUntil != null && n.UrgentUntil <= now)
            .ToListAsync();

        foreach (var need in expired)
        {
            need.Urgency = UrgencyLevel.Normal;
            need.UrgentUntil = null;
        }

        if (expired.Count > 0)
        {
            await _context.SaveChangesAsync();
        }
        return expired.Count;
    }

    private async Task<string?> GetFlaggedTermsAsync(string title, string description)
    {
        if (_moderation == null) return null;
        var terms = await _moderation.FindFlaggedTermsAsync(title, description);
        return terms.Count > 0 ? string.Join(",", terms) : null;
    }

    public async Task<NeedResponse> CreateNeedAsync(CreateNeedRequest request, string userId)
    {
        // Validate category exists
        var category = await _context.Categories.FindAsync(request.CategoryId);
        if (category == null)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "CategoryId", new[] { "Geçersiz kategori seçimi." } }
            });
        }

        // Validate budget range
        if (request.MinBudget.HasValue && request.MaxBudget.HasValue && request.MinBudget > request.MaxBudget)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Budget", new[] { "Minimum bütçe maksimum bütçeden büyük olamaz." } }
            });
        }

        // Validate location
        if ((request.Latitude.HasValue && !request.Longitude.HasValue) || 
            (!request.Latitude.HasValue && request.Longitude.HasValue))
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Location", new[] { "Konum bilgisi için hem enlem hem de boylam gereklidir." } }
            });
        }

        if (request.IsFixedPrice && !(request.MaxBudget > 0))
        {
            throw new ValidationException("Budget", FixedPriceRequiredMessage);
        }

        if (request.Urgency == UrgencyLevel.Urgent)
        {
            await EnsureUrgentSlotAvailableAsync(userId);
        }

        // A fixed price for a catalogued product also counts on that product's price page.
        var product = request.IsFixedPrice && _productPricing != null
            ? await _productPricing.FindLinkableProductAsync(request.Title, request.MaxBudget!.Value, userId)
            : null;

        var flaggedTerms = await GetFlaggedTermsAsync(request.Title, request.Description);
        var requiresReview = RequiresReview(flaggedTerms);
        var now = DateTime.UtcNow;

        var need = new Need
        {
            Title = request.Title,
            Description = request.Description,
            CategoryId = product?.CategoryId ?? request.CategoryId,
            MinBudget = request.IsFixedPrice ? null : request.MinBudget,
            MaxBudget = request.MaxBudget,
            IsFixedPrice = request.IsFixedPrice,
            ProductId = product?.Id,
            Currency = request.Currency,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Address = request.Address,
            Urgency = request.Urgency,
            UrgentUntil = request.Urgency == UrgencyLevel.Urgent ? DateTime.UtcNow.AddDays(UrgentShowcaseDays) : null,
            Status = requiresReview ? NeedStatus.PendingReview : NeedStatus.Active,
            NeedsReview = requiresReview,
            // Auto-approved listings carry an approval time but no reviewer.
            ApprovedAt = ModerationEnabled && !requiresReview ? now : null,
            FlaggedTerms = flaggedTerms,
            UserId = userId,
            CreatedAt = now,
            UpdatedAt = now,
            ExpiresAt = request.ExpiresAt ?? (product != null ? now.AddDays(_productPricing!.ListingLifetimeDays) : null)
        };

        _context.Needs.Add(need);
        await _context.SaveChangesAsync();

        // Add images if provided
        if (request.ImageUrls != null && request.ImageUrls.Any())
        {
            var needImages = request.ImageUrls.Select((url, index) => new NeedImage
            {
                NeedId = need.Id,
                ImageUrl = url,
                SortOrder = index,
                CreatedAt = DateTime.UtcNow
            }).ToList();

            _context.NeedImages.AddRange(needImages);
            await _context.SaveChangesAsync();
        }

        return await GetNeedByIdAsync(need.Id, userId) ?? throw new Exception("İhtiyaç oluşturulduktan sonra bulunamadı.");
    }

    /// <summary>Public listing: only Active needs are ever returned.</summary>
    public Task<PagedResult<NeedResponse>> GetNeedsAsync(NeedFilterRequest filter)
        => QueryNeedsAsync(filter, publicOnly: true);

    private async Task<PagedResult<NeedResponse>> QueryNeedsAsync(NeedFilterRequest filter, bool publicOnly)
    {
        var query = _context.Needs
            .Include(n => n.User)
            .Include(n => n.Category)
            .Include(n => n.Images)
            .Include(n => n.Offers)
            .AsQueryable();

        // Apply filters
        if (filter.CategoryId.HasValue)
        {
            // A root category also covers the listings filed under its subcategories.
            var categoryId = filter.CategoryId.Value;
            query = query.Where(n => n.CategoryId == categoryId || n.Category.ParentCategoryId == categoryId);
        }

        if (filter.CategoryIds != null && filter.CategoryIds.Any())
        {
            query = query.Where(n => filter.CategoryIds.Contains(n.CategoryId));
        }

        if (filter.MinBudget.HasValue)
        {
            query = query.Where(n => !n.MaxBudget.HasValue || n.MaxBudget >= filter.MinBudget.Value);
        }

        if (filter.MaxBudget.HasValue)
        {
            query = query.Where(n => !n.MinBudget.HasValue || n.MinBudget <= filter.MaxBudget.Value);
        }

        if (!string.IsNullOrEmpty(filter.Currency))
        {
            query = query.Where(n => n.Currency == filter.Currency);
        }

        if (filter.Urgency.HasValue)
        {
            query = query.Where(n => n.Urgency == filter.Urgency.Value);
        }

        if (publicOnly)
        {
            // Unmoderated, rejected or closed needs are never public.
            query = query.Where(n => n.Status == NeedStatus.Active);
        }
        else if (filter.Status.HasValue)
        {
            query = query.Where(n => n.Status == filter.Status.Value);
        }

        if (filter.CreatedAfter.HasValue)
        {
            query = query.Where(n => n.CreatedAt >= filter.CreatedAfter.Value);
        }

        if (filter.CreatedBefore.HasValue)
        {
            query = query.Where(n => n.CreatedAt <= filter.CreatedBefore.Value);
        }

        if (!string.IsNullOrEmpty(filter.UserId))
        {
            query = query.Where(n => n.UserId == filter.UserId);
        }

        // Text search
        if (!string.IsNullOrEmpty(filter.SearchText))
        {
            var searchTerm = filter.SearchText.ToLower();
            query = query.Where(n => 
                n.Title.ToLower().Contains(searchTerm) || 
                n.Description.ToLower().Contains(searchTerm) ||
                n.Category.Name.ToLower().Contains(searchTerm) ||
                n.Category.NameTr.ToLower().Contains(searchTerm));
        }

        // Location-based filtering - pre-filter to only include needs with location data
        if (filter.Latitude.HasValue && filter.Longitude.HasValue && filter.RadiusKm.HasValue)
        {
            query = query.Where(n => n.Latitude.HasValue && n.Longitude.HasValue);
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync();

        // Apply sorting
        var showcaseNow = DateTime.UtcNow;
        query = filter.SortBy?.ToLower() switch
        {
            "title" => filter.SortDescending ? query.OrderByDescending(n => n.Title) : query.OrderBy(n => n.Title),
            "budget" => filter.SortDescending ? query.OrderByDescending(n => n.MaxBudget ?? n.MinBudget ?? 0) : query.OrderBy(n => n.MaxBudget ?? n.MinBudget ?? 0),
            "urgency" => filter.SortDescending ? query.OrderByDescending(n => n.Urgency) : query.OrderBy(n => n.Urgency),
            "updatedat" => filter.SortDescending ? query.OrderByDescending(n => n.UpdatedAt) : query.OrderBy(n => n.UpdatedAt),
            "offercount" => filter.SortDescending ? query.OrderByDescending(n => n.Offers.Count) : query.OrderBy(n => n.Offers.Count),
            // Default (newest first): needs holding an "Acil İlanlar" showcase slot are pinned to the top.
            _ => filter.SortDescending
                ? query.OrderByDescending(n => n.Urgency == UrgencyLevel.Urgent && n.UrgentUntil > showcaseNow)
                       .ThenByDescending(n => n.CreatedAt)
                : query.OrderBy(n => n.CreatedAt)
        };

        // Apply pagination
        var needs = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        var needResponses = needs.Select(n => MapToNeedResponse(n, filter.Latitude, filter.Longitude)).ToList();

        // Apply distance filtering after mapping (since we need to calculate distance)
        if (filter.Latitude.HasValue && filter.Longitude.HasValue && filter.RadiusKm.HasValue)
        {
            needResponses = needResponses
                .Where(n => n.DistanceKm.HasValue && n.DistanceKm.Value <= filter.RadiusKm.Value)
                .ToList();
        }

        return new PagedResult<NeedResponse>
        {
            Items = needResponses,
            TotalCount = totalCount,
            Page = filter.Page,
            PageSize = filter.PageSize
        };
    }

    public async Task<NeedResponse?> GetNeedByIdAsync(int needId, string? userId = null)
    {
        var need = await _context.Needs
            .Include(n => n.User)
            .Include(n => n.Category)
            .Include(n => n.Images.OrderBy(i => i.SortOrder))
            .Include(n => n.Offers)
            .Include(n => n.Product)
            .Include(n => n.PriceWatches)
            .FirstOrDefaultAsync(n => n.Id == needId);

        if (need == null)
        {
            return null;
        }

        var response = MapToNeedResponse(need);
        response.IsWatchingPrice = !string.IsNullOrEmpty(userId) && need.PriceWatches.Any(w => w.UserId == userId);
        return response;
    }

    public async Task<NeedResponse?> UpdateNeedAsync(int needId, UpdateNeedRequest request, string userId)
    {
        var need = await _context.Needs
            .Include(n => n.Images)
            .FirstOrDefaultAsync(n => n.Id == needId && n.UserId == userId);

        if (need == null)
        {
            throw new NotFoundException("İhtiyaç bulunamadı veya güncelleme yetkiniz yok.");
        }

        if (_productPricing != null)
        {
            await _productPricing.EnsureEditAllowedAsync(need, request);
        }

        // Content/detail edits are only allowed while the listing is live or under moderation.
        // (Status-only requests, e.g. closing a listing, are handled by the status rules below.)
        var editsDetails = request.Title != null || request.Description != null || request.CategoryId.HasValue ||
                           request.IsFixedPrice.HasValue ||
                           request.MinBudget.HasValue || request.MaxBudget.HasValue || request.Currency != null ||
                           request.Latitude.HasValue || request.Longitude.HasValue || request.Address != null ||
                           request.Urgency.HasValue || request.ExpiresAt.HasValue || request.ImageUrls != null;
        if (editsDetails && !IsEditableStatus(need.Status))
        {
            throw new BusinessException(NotEditableMessage);
        }

        var wasFixedPrice = need.IsFixedPrice;
        var oldPrice = need.MaxBudget;
        var oldTitle = need.Title;
        var oldDescription = need.Description;
        var oldCategoryId = need.CategoryId;
        var imagesChanged = request.ImageUrls != null &&
            !request.ImageUrls.SequenceEqual(need.Images.OrderBy(i => i.SortOrder).Select(i => i.ImageUrl));

        // Update fields if provided
        if (!string.IsNullOrEmpty(request.Title))
        {
            need.Title = request.Title;
        }

        if (!string.IsNullOrEmpty(request.Description))
        {
            need.Description = request.Description;
        }

        if (request.CategoryId.HasValue)
        {
            var category = await _context.Categories.FindAsync(request.CategoryId.Value);
            if (category == null)
            {
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    { "CategoryId", new[] { "Geçersiz kategori seçimi." } }
                });
            }
            need.CategoryId = request.CategoryId.Value;
        }

        if (request.MinBudget.HasValue)
        {
            need.MinBudget = request.MinBudget.Value;
        }

        if (request.MaxBudget.HasValue)
        {
            need.MaxBudget = request.MaxBudget.Value;
        }

        need.IsFixedPrice = request.IsFixedPrice ?? need.IsFixedPrice;
        if (need.IsFixedPrice)
        {
            if (!(need.MaxBudget > 0))
            {
                throw new ValidationException("Budget", FixedPriceRequiredMessage);
            }
            need.MinBudget = null;
        }

        // Validate budget range
        if (need.MinBudget.HasValue && need.MaxBudget.HasValue && need.MinBudget > need.MaxBudget)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Budget", new[] { "Minimum bütçe maksimum bütçeden büyük olamaz." } }
            });
        }

        if (wasFixedPrice && !need.IsFixedPrice)
        {
            // Open to bargaining again: the price no longer counts on a product's price page.
            need.ProductId = null;
        }
        else if (need.IsFixedPrice && need.ProductId == null && _productPricing != null &&
                 (!wasFixedPrice || need.Title != oldTitle))
        {
            var product = await _productPricing.FindLinkableProductAsync(need.Title, need.MaxBudget!.Value, userId, need.Id);
            if (product != null)
            {
                need.ProductId = product.Id;
                need.CategoryId = product.CategoryId;
                need.ExpiresAt ??= DateTime.UtcNow.AddDays(_productPricing.ListingLifetimeDays);
            }
        }

        var priceRaised = wasFixedPrice && need.IsFixedPrice && need.MaxBudget > oldPrice;
        var openedToOffers = wasFixedPrice && !need.IsFixedPrice;
        if (need.IsFixedPrice != wasFixedPrice || need.MaxBudget != oldPrice)
        {
            need.PriceNudgeSentAt = null;
        }

        if (!string.IsNullOrEmpty(request.Currency))
        {
            need.Currency = request.Currency;
        }

        if (request.Latitude.HasValue)
        {
            need.Latitude = request.Latitude.Value;
        }

        if (request.Longitude.HasValue)
        {
            need.Longitude = request.Longitude.Value;
        }

        if (request.Address != null)
        {
            need.Address = request.Address;
        }

        if (request.Urgency.HasValue && request.Urgency.Value != need.Urgency)
        {
            if (request.Urgency.Value == UrgencyLevel.Urgent)
            {
                await EnsureUrgentSlotAvailableAsync(userId, need.Id);
                need.UrgentUntil = DateTime.UtcNow.AddDays(UrgentShowcaseDays);
            }
            else
            {
                need.UrgentUntil = null;
            }
            need.Urgency = request.Urgency.Value;
        }

        if (request.Status.HasValue && request.Status.Value != need.Status)
        {
            var target = request.Status.Value;
            if (target == NeedStatus.PendingReview || target == NeedStatus.Rejected)
            {
                throw new ValidationException("Status", "Bu durum yalnızca yönetici tarafından ayarlanabilir.");
            }

            var underModeration = need.Status == NeedStatus.PendingReview || need.Status == NeedStatus.Rejected;
            if (underModeration && target != NeedStatus.Cancelled)
            {
                throw new ValidationException("Status", "İlanınız onaylanmadan bu durum değiştirilemez.");
            }

            // Re-opening a listing whose content was never approved sends it to review instead.
            if (target == NeedStatus.Active && ModerationEnabled && need.NeedsReview)
            {
                target = NeedStatus.PendingReview;
            }

            // Re-opening a closed need that still holds showcase time must not create a second slot.
            var reopening = need.Status == NeedStatus.Cancelled || need.Status == NeedStatus.Completed ||
                            need.Status == NeedStatus.Expired;
            if (reopening && (target == NeedStatus.Active || target == NeedStatus.PendingReview) &&
                need.Urgency == UrgencyLevel.Urgent && need.UrgentUntil > DateTime.UtcNow)
            {
                await EnsureUrgentSlotAvailableAsync(userId, need.Id);
            }

            need.Status = target;
        }

        var contentChanged = need.Title != oldTitle || need.Description != oldDescription ||
                             need.CategoryId != oldCategoryId || imagesChanged;
        if (contentChanged)
        {
            need.FlaggedTerms = await GetFlaggedTermsAsync(need.Title, need.Description);

            // A clean edit of a live listing stays live. Anything an admin has rejected, or that
            // is still waiting, goes back through review however clean the new text looks.
            var wasHeldByModeration = need.NeedsReview || need.Status == NeedStatus.Rejected ||
                                      need.Status == NeedStatus.PendingReview;
            if (ModerationEnabled && (wasHeldByModeration || RequiresReview(need.FlaggedTerms)))
            {
                need.NeedsReview = true;
                if (need.Status == NeedStatus.Active || need.Status == NeedStatus.Rejected)
                {
                    need.Status = NeedStatus.PendingReview;
                    need.RejectionReason = null;
                    need.RejectionNote = null;
                }
            }
        }

        if (request.ExpiresAt.HasValue)
        {
            need.ExpiresAt = request.ExpiresAt.Value;
        }

        need.UpdatedAt = DateTime.UtcNow;

        // Update images if provided
        if (request.ImageUrls != null)
        {
            // Remove existing images
            _context.NeedImages.RemoveRange(need.Images);

            // Add new images
            if (request.ImageUrls.Any())
            {
                var needImages = request.ImageUrls.Select((url, index) => new NeedImage
                {
                    NeedId = need.Id,
                    ImageUrl = url,
                    SortOrder = index,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                _context.NeedImages.AddRange(needImages);
            }
        }

        await _context.SaveChangesAsync();

        if ((priceRaised || openedToOffers) && need.Status == NeedStatus.Active)
        {
            await NotifyPriceWatchersAsync(_context, need, openedToOffers);
        }

        return await GetNeedByIdAsync(needId, userId);
    }

    // ------------------------------------------------------------ "fiyat artarsa haber ver"

    public async Task<PriceWatchResponse> SetPriceWatchAsync(int needId, string userId, bool watch)
    {
        var need = await _context.Needs.Include(n => n.PriceWatches).FirstOrDefaultAsync(n => n.Id == needId)
            ?? throw new NotFoundException("İlan bulunamadı.");

        var existing = need.PriceWatches.FirstOrDefault(w => w.UserId == userId);
        if (watch && existing == null)
        {
            if (need.UserId == userId)
            {
                throw new BusinessException("Kendi ilanınızı takip edemezsiniz.");
            }
            if (need.Status != NeedStatus.Active || !need.IsFixedPrice)
            {
                throw new BusinessException("Bu ilan için fiyat takibi açılamıyor.");
            }
            need.PriceWatches.Add(new NeedPriceWatch { NeedId = need.Id, UserId = userId, CreatedAt = DateTime.UtcNow });
            await _context.SaveChangesAsync();
        }
        else if (!watch && existing != null)
        {
            _context.NeedPriceWatches.Remove(existing);
            await _context.SaveChangesAsync();
        }

        return new PriceWatchResponse
        {
            IsWatchingPrice = watch,
            PriceWatchCount = await _context.NeedPriceWatches.CountAsync(w => w.NeedId == needId)
        };
    }

    /// <summary>
    /// Tells the sellers who were waiting that the buyer raised the price or opened the listing to
    /// bargaining. The watch is used up: they are told once per change they asked about.
    /// </summary>
    public static async Task NotifyPriceWatchersAsync(ApplicationDbContext context, Need need, bool openedToOffers)
    {
        var watches = await context.NeedPriceWatches.Where(w => w.NeedId == need.Id).ToListAsync();
        if (watches.Count == 0) return;

        var price = (need.MaxBudget ?? 0).ToString("N0", new System.Globalization.CultureInfo("tr-TR"));
        var now = DateTime.UtcNow;
        foreach (var watch in watches)
        {
            context.Notifications.Add(new Notification
            {
                UserId = watch.UserId,
                Type = "price_raised",
                Title = openedToOffers ? "İlan pazarlığa açıldı" : "Alıcı fiyatı artırdı",
                Body = openedToOffers
                    ? $"\"{need.Title}\" ilanının sahibi ilanı pazarlığa açtı. Artık kendi fiyatınızla teklif verebilirsiniz."
                    : $"\"{need.Title}\" ilanının yeni fiyatı {price} TL. Uygunsa tek dokunuşla teklif verebilirsiniz.",
                Data = System.Text.Json.JsonSerializer.Serialize(new { type = "price_raised", needId = need.Id }),
                CreatedAt = now
            });
        }
        context.NeedPriceWatches.RemoveRange(watches);
        await context.SaveChangesAsync();
    }

    public const string NotEditableMessage = "Bu ilan artık düzenlenemez.";

    public static bool IsEditableStatus(NeedStatus status) =>
        status == NeedStatus.Active || status == NeedStatus.PendingReview || status == NeedStatus.Rejected;

    public async Task<bool> DeleteNeedAsync(int needId, string userId)
    {
        var need = await _context.Needs
            .FirstOrDefaultAsync(n => n.Id == needId && n.UserId == userId);

        if (need == null)
        {
            return false;
        }

        // Check if there are active offers
        var hasActiveOffers = await _context.Offers
            .AnyAsync(o => o.NeedId == needId && o.Status == OfferStatus.Pending);

        if (hasActiveOffers)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Need", new[] { "Aktif teklifleri olan ihtiyaç silinemez." } }
            });
        }

        _context.Needs.Remove(need);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<PagedResult<NeedResponse>> GetUserNeedsAsync(string userId, NeedStatus? status = null, int page = 1, int pageSize = 20, bool ownerView = false)
    {
        var filter = new NeedFilterRequest
        {
            UserId = userId,
            Status = status,
            Page = page,
            PageSize = pageSize
        };

        // The owner sees all statuses (pending review, rejected, ...); everyone else only Active.
        return await QueryNeedsAsync(filter, publicOnly: !ownerView);
    }

    public async Task<List<NeedResponse>> SearchNeedsAsync(string searchText, double? latitude = null, double? longitude = null, double? radiusKm = null, int maxResults = 50)
    {
        var filter = new NeedFilterRequest
        {
            SearchText = searchText,
            Latitude = latitude,
            Longitude = longitude,
            RadiusKm = radiusKm,
            PageSize = maxResults,
            Status = NeedStatus.Active
        };

        var result = await GetNeedsAsync(filter);
        return result.Items;
    }

    public async Task<bool> ExpireNeedAsync(int needId)
    {
        var need = await _context.Needs.FindAsync(needId);
        if (need == null)
        {
            return false;
        }

        need.Status = NeedStatus.Expired;
        need.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<NeedResponse>> GetNearbyNeedsAsync(double latitude, double longitude, double radiusKm = 10, int maxResults = 50)
    {
        var filter = new NeedFilterRequest
        {
            Latitude = latitude,
            Longitude = longitude,
            RadiusKm = radiusKm,
            PageSize = maxResults,
            Status = NeedStatus.Active
        };

        var result = await GetNeedsAsync(filter);
        return result.Items;
    }

    private static NeedResponse MapToNeedResponse(Need need, double? userLatitude = null, double? userLongitude = null)
    {
        var response = new NeedResponse
        {
            Id = need.Id,
            Title = need.Title,
            Description = need.Description,
            CategoryId = need.CategoryId,
            CategoryName = need.Category?.NameTr ?? need.Category?.Name ?? "",
            MinBudget = need.MinBudget,
            MaxBudget = need.MaxBudget,
            Currency = need.Currency,
            Latitude = need.Latitude,
            Longitude = need.Longitude,
            Address = need.Address,
            Urgency = need.Urgency,
            UrgentUntil = need.UrgentUntil,
            Status = need.Status,
            CreatedAt = need.CreatedAt,
            UpdatedAt = need.UpdatedAt,
            ExpiresAt = need.ExpiresAt,
            UserId = need.UserId,
            UserName = $"{need.User?.FirstName} {need.User?.LastName}".Trim(),
            UserProfileImageUrl = need.User?.ProfileImageUrl,
            Images = need.Images?.Select(i => new NeedImageResponse
            {
                Id = i.Id,
                ImageUrl = i.ImageUrl,
                AltText = i.AltText,
                SortOrder = i.SortOrder
            }).OrderBy(i => i.SortOrder).ToList() ?? new List<NeedImageResponse>(),
            OfferCount = need.Offers?.Count ?? 0,
            IsFixedPrice = need.IsFixedPrice,
            PriceWatchCount = need.PriceWatches?.Count ?? 0,
            ProductSlug = need.Product?.Slug,
            RejectionReason = need.RejectionReason,
            RejectionReasonText = ModerationLabels.For(need.RejectionReason),
            RejectionNote = need.RejectionNote,
            ApprovedAt = need.ApprovedAt
        };

        // Calculate distance if user location is provided
        if (userLatitude.HasValue && userLongitude.HasValue && 
            need.Latitude.HasValue && need.Longitude.HasValue)
        {
            response.DistanceKm = CalculateDistance(
                userLatitude.Value, userLongitude.Value,
                need.Latitude.Value, need.Longitude.Value);
        }

        return response;
    }

    private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371; // Earth's radius in kilometers

        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return R * c;
    }

    private static double ToRadians(double degrees)
    {
        return degrees * Math.PI / 180;
    }

    /// <summary>
    /// Get trending needs based on offer count and recent activity
    /// </summary>
    public async Task<List<NeedResponse>> GetTrendingNeedsAsync(int maxResults = 20)
    {
        var trendingNeeds = await _context.Needs
            .Include(n => n.User)
            .Include(n => n.Category)
            .Include(n => n.Images)
            .Include(n => n.Offers)
            .Where(n => n.Status == NeedStatus.Active)
            .Where(n => n.CreatedAt >= DateTime.UtcNow.AddDays(-7)) // Last 7 days
            .OrderByDescending(n => n.Offers.Count)
            .ThenByDescending(n => n.CreatedAt)
            .Take(maxResults)
            .ToListAsync();

        return trendingNeeds.Select(n => MapToNeedResponse(n)).ToList();
    }

    /// <summary>
    /// Get needs by multiple categories (including subcategories)
    /// </summary>
    public async Task<PagedResult<NeedResponse>> GetNeedsByCategoriesAsync(List<int> categoryIds, int page = 1, int pageSize = 20)
    {
        // Get all subcategories for the provided category IDs
        var allCategoryIds = new List<int>(categoryIds);
        
        var subcategories = await _context.Categories
            .Where(c => categoryIds.Contains(c.ParentCategoryId ?? 0))
            .Select(c => c.Id)
            .ToListAsync();
        
        allCategoryIds.AddRange(subcategories);

        var filter = new NeedFilterRequest
        {
            CategoryIds = allCategoryIds,
            Page = page,
            PageSize = pageSize,
            Status = NeedStatus.Active
        };

        return await GetNeedsAsync(filter);
    }

    /// <summary>
    /// Get needs with urgent priority
    /// </summary>
    public async Task<List<NeedResponse>> GetUrgentNeedsAsync(double? latitude = null, double? longitude = null, double? radiusKm = null, int maxResults = 50)
    {
        var filter = new NeedFilterRequest
        {
            Urgency = UrgencyLevel.Urgent,
            Latitude = latitude,
            Longitude = longitude,
            RadiusKm = radiusKm,
            PageSize = maxResults,
            Status = NeedStatus.Active,
            SortBy = "CreatedAt",
            SortDescending = true
        };

        var result = await GetNeedsAsync(filter);
        return result.Items;
    }

    /// <summary>
    /// Get needs expiring soon (within next 24 hours)
    /// </summary>
    public async Task<List<NeedResponse>> GetExpiringSoonNeedsAsync(int maxResults = 50)
    {
        var tomorrow = DateTime.UtcNow.AddDays(1);
        
        var filter = new NeedFilterRequest
        {
            Status = NeedStatus.Active,
            PageSize = maxResults,
            SortBy = "ExpiresAt",
            SortDescending = false
        };

        var result = await GetNeedsAsync(filter);
        
        // Filter to only include needs expiring within 24 hours
        var expiringSoon = result.Items
            .Where(n => n.ExpiresAt.HasValue && n.ExpiresAt.Value <= tomorrow)
            .ToList();

        return expiringSoon;
    }

    /// <summary>
    /// Advanced text search with relevance scoring
    /// </summary>
    public async Task<List<NeedResponse>> AdvancedTextSearchAsync(string searchText, int maxResults = 50)
    {
        if (string.IsNullOrWhiteSpace(searchText))
        {
            return new List<NeedResponse>();
        }

        var searchTerms = searchText.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        
        var needs = await _context.Needs
            .Include(n => n.User)
            .Include(n => n.Category)
            .Include(n => n.Images)
            .Include(n => n.Offers)
            .Where(n => n.Status == NeedStatus.Active)
            .ToListAsync();

        // Calculate relevance score for each need
        var scoredNeeds = needs.Select(need => new
        {
            Need = need,
            Score = CalculateRelevanceScore(need, searchTerms)
        })
        .Where(x => x.Score > 0)
        .OrderByDescending(x => x.Score)
        .Take(maxResults)
        .Select(x => MapToNeedResponse(x.Need))
        .ToList();

        return scoredNeeds;
    }

    private static int CalculateRelevanceScore(Need need, string[] searchTerms)
    {
        var score = 0;
        var title = need.Title.ToLower();
        var description = need.Description.ToLower();
        var categoryName = (need.Category?.Name ?? "").ToLower();
        var categoryNameTr = (need.Category?.NameTr ?? "").ToLower();

        foreach (var term in searchTerms)
        {
            // Title matches get highest score
            if (title.Contains(term))
            {
                score += title.StartsWith(term) ? 10 : 5;
            }

            // Category matches get medium score
            if (categoryName.Contains(term) || categoryNameTr.Contains(term))
            {
                score += 3;
            }

            // Description matches get lower score
            if (description.Contains(term))
            {
                score += 1;
            }
        }

        // Boost score for urgent needs
        if (need.Urgency == UrgencyLevel.Urgent)
        {
            score += 2;
        }

        // Boost score for recent needs
        if (need.CreatedAt >= DateTime.UtcNow.AddDays(-3))
        {
            score += 1;
        }

        return score;
    }

    /// <summary>
    /// Get needs within a specific budget range with smart matching
    /// </summary>
    public async Task<List<NeedResponse>> GetNeedsByBudgetRangeAsync(decimal minBudget, decimal maxBudget, string currency = "TRY", int maxResults = 50)
    {
        var needs = await _context.Needs
            .Include(n => n.User)
            .Include(n => n.Category)
            .Include(n => n.Images)
            .Include(n => n.Offers)
            .Where(n => n.Status == NeedStatus.Active && n.Currency == currency)
            .Where(n => 
                // Need has no budget specified (open to offers)
                (!n.MinBudget.HasValue && !n.MaxBudget.HasValue) ||
                // Need's budget range overlaps with search range
                (n.MinBudget.HasValue && n.MinBudget.Value <= maxBudget) ||
                (n.MaxBudget.HasValue && n.MaxBudget.Value >= minBudget))
            .OrderByDescending(n => n.CreatedAt)
            .Take(maxResults)
            .ToListAsync();

        return needs.Select(n => MapToNeedResponse(n)).ToList();
    }
}