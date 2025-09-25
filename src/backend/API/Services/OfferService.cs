using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Interfaces;
using API.Models;
using API.Middleware;

namespace API.Services;

public class OfferService : IOfferService
{
    private readonly ApplicationDbContext _context;
    private readonly IFileStorageService _fileStorageService;
    private readonly INotificationService _notificationService;

    public OfferService(ApplicationDbContext context, IFileStorageService fileStorageService, INotificationService notificationService)
    {
        _context = context;
        _fileStorageService = fileStorageService;
        _notificationService = notificationService;
    }

    public async Task<OfferResponse> CreateOfferAsync(CreateOfferRequest request, string providerId)
    {
        // Validate need exists and is active
        var need = await _context.Needs
            .Include(n => n.User)
            .FirstOrDefaultAsync(n => n.Id == request.NeedId);
            
        if (need == null)
        {
            throw new NotFoundException("İhtiyaç bulunamadı.");
        }

        if (need.Status != NeedStatus.Active)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "NeedId", new[] { "Bu ihtiyaç artık aktif değil." } }
            });
        }

        // Check if need has expired
        if (need.ExpiresAt.HasValue && need.ExpiresAt.Value <= DateTime.UtcNow)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "NeedId", new[] { "Bu ihtiyacın süresi dolmuş." } }
            });
        }

        // Validate provider is not the need owner
        if (need.UserId == providerId)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "ProviderId", new[] { "Kendi ihtiyacınıza teklif veremezsiniz." } }
            });
        }

        // Check if provider already has a pending offer for this need
        var existingOffer = await _context.Offers
            .FirstOrDefaultAsync(o => o.NeedId == request.NeedId && 
                                    o.ProviderId == providerId && 
                                    o.Status == OfferStatus.Pending);
                                    
        if (existingOffer != null)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "ProviderId", new[] { "Bu ihtiyaç için zaten bekleyen bir teklifiniz var." } }
            });
        }

        // Validate currency matches need currency if specified
        if (!string.IsNullOrEmpty(need.Currency) && request.Currency != need.Currency)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Currency", new[] { $"Para birimi {need.Currency} olmalıdır." } }
            });
        }

        // Validate price is within budget range if specified
        if (need.MinBudget.HasValue && request.Price < need.MinBudget.Value)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Price", new[] { $"Teklif fiyatı minimum bütçe ({need.MinBudget.Value} {need.Currency}) altında olamaz." } }
            });
        }

        if (need.MaxBudget.HasValue && request.Price > need.MaxBudget.Value)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Price", new[] { $"Teklif fiyatı maksimum bütçe ({need.MaxBudget.Value} {need.Currency}) üzerinde olamaz." } }
            });
        }

        var offer = new Offer
        {
            NeedId = request.NeedId,
            ProviderId = providerId,
            Price = request.Price,
            Currency = request.Currency,
            Description = request.Description,
            DeliveryDays = request.DeliveryDays,
            Status = OfferStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Offers.Add(offer);
        await _context.SaveChangesAsync();

        // Add images if provided
        if (request.ImageUrls != null && request.ImageUrls.Any())
        {
            var offerImages = request.ImageUrls.Select((url, index) => new OfferImage
            {
                OfferId = offer.Id,
                ImageUrl = url,
                SortOrder = index,
                CreatedAt = DateTime.UtcNow
            }).ToList();

            _context.OfferImages.AddRange(offerImages);
            await _context.SaveChangesAsync();
        }

        // Trigger notification
        await NotifyNewOfferAsync(offer.Id);

        return await GetOfferByIdAsync(offer.Id, providerId) ?? throw new Exception("Teklif oluşturulduktan sonra bulunamadı.");
    }

    public async Task<OfferResponse?> GetOfferByIdAsync(int offerId, string? userId = null)
    {
        var offer = await _context.Offers
            .Include(o => o.Need)
            .Include(o => o.Provider)
            .Include(o => o.Images)
            .Include(o => o.Messages)
            .FirstOrDefaultAsync(o => o.Id == offerId);

        if (offer == null)
        {
            return null;
        }

        // Check access permissions
        if (userId != null && !await CanUserAccessOfferAsync(offerId, userId))
        {
            throw new UnauthorizedException("Bu teklife erişim yetkiniz yok.");
        }

        return MapToOfferResponse(offer, userId);
    }

    public async Task<OfferResponse?> UpdateOfferAsync(int offerId, UpdateOfferRequest request, string providerId)
    {
        var offer = await _context.Offers
            .Include(o => o.Need)
            .Include(o => o.Images)
            .FirstOrDefaultAsync(o => o.Id == offerId);

        if (offer == null)
        {
            throw new NotFoundException("Teklif bulunamadı.");
        }

        if (offer.ProviderId != providerId)
        {
            throw new UnauthorizedException("Bu teklifi düzenleme yetkiniz yok.");
        }

        if (offer.Status != OfferStatus.Pending)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Status", new[] { "Sadece bekleyen teklifler düzenlenebilir." } }
            });
        }

        // Update fields if provided
        if (request.Price.HasValue)
        {
            // Validate price is within budget range if specified
            if (offer.Need.MinBudget.HasValue && request.Price.Value < offer.Need.MinBudget.Value)
            {
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    { "Price", new[] { $"Teklif fiyatı minimum bütçe ({offer.Need.MinBudget.Value} {offer.Need.Currency}) altında olamaz." } }
                });
            }

            if (offer.Need.MaxBudget.HasValue && request.Price.Value > offer.Need.MaxBudget.Value)
            {
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    { "Price", new[] { $"Teklif fiyatı maksimum bütçe ({offer.Need.MaxBudget.Value} {offer.Need.Currency}) üzerinde olamaz." } }
                });
            }

            offer.Price = request.Price.Value;
        }

        if (!string.IsNullOrEmpty(request.Currency))
        {
            offer.Currency = request.Currency;
        }

        if (!string.IsNullOrEmpty(request.Description))
        {
            offer.Description = request.Description;
        }

        if (request.DeliveryDays.HasValue)
        {
            offer.DeliveryDays = request.DeliveryDays.Value;
        }

        offer.UpdatedAt = DateTime.UtcNow;

        // Update images if provided
        if (request.ImageUrls != null)
        {
            // Remove existing images
            var existingImages = await _context.OfferImages
                .Where(oi => oi.OfferId == offerId)
                .ToListAsync();
            _context.OfferImages.RemoveRange(existingImages);

            // Add new images
            if (request.ImageUrls.Any())
            {
                var newImages = request.ImageUrls.Select((url, index) => new OfferImage
                {
                    OfferId = offerId,
                    ImageUrl = url,
                    SortOrder = index,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                _context.OfferImages.AddRange(newImages);
            }
        }

        await _context.SaveChangesAsync();

        return await GetOfferByIdAsync(offerId, providerId);
    }

    public async Task<bool> DeleteOfferAsync(int offerId, string providerId)
    {
        var offer = await _context.Offers.FindAsync(offerId);

        if (offer == null)
        {
            return false;
        }

        if (offer.ProviderId != providerId)
        {
            throw new UnauthorizedException("Bu teklifi silme yetkiniz yok.");
        }

        if (offer.Status == OfferStatus.Accepted)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Status", new[] { "Kabul edilmiş teklifler silinemez." } }
            });
        }

        // Remove associated images
        var images = await _context.OfferImages
            .Where(oi => oi.OfferId == offerId)
            .ToListAsync();
        _context.OfferImages.RemoveRange(images);

        // Remove associated messages
        var messages = await _context.Messages
            .Where(m => m.OfferId == offerId)
            .ToListAsync();
        _context.Messages.RemoveRange(messages);

        _context.Offers.Remove(offer);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<PagedResult<OfferResponse>> GetOffersForNeedAsync(int needId, int page = 1, int pageSize = 20)
    {
        var query = _context.Offers
            .Include(o => o.Need)
            .Include(o => o.Provider)
            .Include(o => o.Images)
            .Include(o => o.Messages)
            .Where(o => o.NeedId == needId)
            .OrderByDescending(o => o.CreatedAt);

        var totalCount = await query.CountAsync();
        var offers = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<OfferResponse>
        {
            Items = offers.Select(o => MapToOfferResponse(o)).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<PagedResult<OfferResponse>> GetProviderOffersAsync(string providerId, OfferStatus? status = null, int page = 1, int pageSize = 20)
    {
        var query = _context.Offers
            .Include(o => o.Need)
            .Include(o => o.Provider)
            .Include(o => o.Images)
            .Include(o => o.Messages)
            .Where(o => o.ProviderId == providerId);

        if (status.HasValue)
        {
            query = query.Where(o => o.Status == status.Value);
        }

        query = query.OrderByDescending(o => o.CreatedAt);

        var totalCount = await query.CountAsync();
        var offers = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<OfferResponse>
        {
            Items = offers.Select(o => MapToOfferResponse(o, providerId)).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<PagedResult<OfferResponse>> GetBuyerOffersAsync(string buyerId, OfferStatus? status = null, int page = 1, int pageSize = 20)
    {
        var query = _context.Offers
            .Include(o => o.Need)
            .Include(o => o.Provider)
            .Include(o => o.Images)
            .Include(o => o.Messages)
            .Where(o => o.Need.UserId == buyerId);

        if (status.HasValue)
        {
            query = query.Where(o => o.Status == status.Value);
        }

        query = query.OrderByDescending(o => o.CreatedAt);

        var totalCount = await query.CountAsync();
        var offers = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<OfferResponse>
        {
            Items = offers.Select(o => MapToOfferResponse(o, buyerId)).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<PagedResult<OfferResponse>> GetOffersAsync(OfferFilterRequest filter)
    {
        var query = _context.Offers
            .Include(o => o.Need)
            .Include(o => o.Provider)
            .Include(o => o.Images)
            .Include(o => o.Messages)
            .AsQueryable();

        // Apply filters
        if (filter.NeedId.HasValue)
        {
            query = query.Where(o => o.NeedId == filter.NeedId.Value);
        }

        if (!string.IsNullOrEmpty(filter.ProviderId))
        {
            query = query.Where(o => o.ProviderId == filter.ProviderId);
        }

        if (filter.MinPrice.HasValue)
        {
            query = query.Where(o => o.Price >= filter.MinPrice.Value);
        }

        if (filter.MaxPrice.HasValue)
        {
            query = query.Where(o => o.Price <= filter.MaxPrice.Value);
        }

        if (!string.IsNullOrEmpty(filter.Currency))
        {
            query = query.Where(o => o.Currency == filter.Currency);
        }

        if (filter.Status.HasValue)
        {
            query = query.Where(o => o.Status == filter.Status.Value);
        }

        if (filter.CreatedAfter.HasValue)
        {
            query = query.Where(o => o.CreatedAt >= filter.CreatedAfter.Value);
        }

        if (filter.CreatedBefore.HasValue)
        {
            query = query.Where(o => o.CreatedAt <= filter.CreatedBefore.Value);
        }

        if (filter.MaxDeliveryDays.HasValue)
        {
            query = query.Where(o => o.DeliveryDays <= filter.MaxDeliveryDays.Value);
        }

        // Apply sorting
        query = filter.SortBy?.ToLower() switch
        {
            "price" => filter.SortDescending ? query.OrderByDescending(o => o.Price) : query.OrderBy(o => o.Price),
            "deliverydays" => filter.SortDescending ? query.OrderByDescending(o => o.DeliveryDays) : query.OrderBy(o => o.DeliveryDays),
            "status" => filter.SortDescending ? query.OrderByDescending(o => o.Status) : query.OrderBy(o => o.Status),
            _ => filter.SortDescending ? query.OrderByDescending(o => o.CreatedAt) : query.OrderBy(o => o.CreatedAt)
        };

        var totalCount = await query.CountAsync();
        var offers = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return new PagedResult<OfferResponse>
        {
            Items = offers.Select(o => MapToOfferResponse(o)).ToList(),
            TotalCount = totalCount,
            Page = filter.Page,
            PageSize = filter.PageSize
        };
    }

    public async Task<bool> AcceptOfferAsync(int offerId, string buyerId)
    {
        var offer = await _context.Offers
            .Include(o => o.Need)
            .FirstOrDefaultAsync(o => o.Id == offerId);

        if (offer == null)
        {
            throw new NotFoundException("Teklif bulunamadı.");
        }

        if (offer.Need.UserId != buyerId)
        {
            throw new UnauthorizedException("Bu teklifi kabul etme yetkiniz yok.");
        }

        if (offer.Status != OfferStatus.Pending)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Status", new[] { "Sadece bekleyen teklifler kabul edilebilir." } }
            });
        }

        if (offer.Need.Status != NeedStatus.Active)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "NeedStatus", new[] { "Bu ihtiyaç artık aktif değil." } }
            });
        }

        // Accept the offer
        offer.Status = OfferStatus.Accepted;
        offer.UpdatedAt = DateTime.UtcNow;

        // Update need status to InProgress
        offer.Need.Status = NeedStatus.InProgress;
        offer.Need.UpdatedAt = DateTime.UtcNow;

        // Reject all other pending offers for this need
        var otherOffers = await _context.Offers
            .Where(o => o.NeedId == offer.NeedId && o.Id != offerId && o.Status == OfferStatus.Pending)
            .ToListAsync();

        foreach (var otherOffer in otherOffers)
        {
            otherOffer.Status = OfferStatus.Rejected;
            otherOffer.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // Trigger notifications
        await NotifyOfferStatusChangeAsync(offerId, OfferStatus.Accepted);
        
        // Notify rejected providers
        foreach (var rejectedOffer in otherOffers)
        {
            await NotifyOfferStatusChangeAsync(rejectedOffer.Id, OfferStatus.Rejected);
        }

        return true;
    }

    public async Task<bool> RejectOfferAsync(int offerId, string buyerId, string? reason = null)
    {
        var offer = await _context.Offers
            .Include(o => o.Need)
            .FirstOrDefaultAsync(o => o.Id == offerId);

        if (offer == null)
        {
            throw new NotFoundException("Teklif bulunamadı.");
        }

        if (offer.Need.UserId != buyerId)
        {
            throw new UnauthorizedException("Bu teklifi reddetme yetkiniz yok.");
        }

        if (offer.Status != OfferStatus.Pending)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Status", new[] { "Sadece bekleyen teklifler reddedilebilir." } }
            });
        }

        offer.Status = OfferStatus.Rejected;
        offer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Trigger notification
        await NotifyOfferStatusChangeAsync(offerId, OfferStatus.Rejected);

        return true;
    }

    public async Task<bool> WithdrawOfferAsync(int offerId, string providerId)
    {
        var offer = await _context.Offers.FindAsync(offerId);

        if (offer == null)
        {
            throw new NotFoundException("Teklif bulunamadı.");
        }

        if (offer.ProviderId != providerId)
        {
            throw new UnauthorizedException("Bu teklifi geri çekme yetkiniz yok.");
        }

        if (offer.Status != OfferStatus.Pending)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Status", new[] { "Sadece bekleyen teklifler geri çekilebilir." } }
            });
        }

        offer.Status = OfferStatus.Withdrawn;
        offer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> CanUserAccessOfferAsync(int offerId, string userId)
    {
        var offer = await _context.Offers
            .Include(o => o.Need)
            .FirstOrDefaultAsync(o => o.Id == offerId);

        if (offer == null)
        {
            return false;
        }

        // Provider can access their own offers
        if (offer.ProviderId == userId)
        {
            return true;
        }

        // Need owner can access all offers for their need
        if (offer.Need.UserId == userId)
        {
            return true;
        }

        return false;
    }

    public async Task<bool> CanProviderCreateOfferAsync(int needId, string providerId)
    {
        var need = await _context.Needs.FindAsync(needId);

        if (need == null || need.Status != NeedStatus.Active)
        {
            return false;
        }

        // Provider cannot offer on their own need
        if (need.UserId == providerId)
        {
            return false;
        }

        // Check if provider already has a pending offer
        var existingOffer = await _context.Offers
            .AnyAsync(o => o.NeedId == needId && o.ProviderId == providerId && o.Status == OfferStatus.Pending);

        return !existingOffer;
    }

    public async Task<bool> CanBuyerManageOfferAsync(int offerId, string buyerId)
    {
        var offer = await _context.Offers
            .Include(o => o.Need)
            .FirstOrDefaultAsync(o => o.Id == offerId);

        return offer != null && offer.Need.UserId == buyerId;
    }

    public async Task<bool> CanProviderManageOfferAsync(int offerId, string providerId)
    {
        var offer = await _context.Offers.FindAsync(offerId);
        return offer != null && offer.ProviderId == providerId;
    }

    public async Task<OfferStatsResponse> GetOfferStatsForNeedAsync(int needId)
    {
        var offers = await _context.Offers
            .Where(o => o.NeedId == needId)
            .ToListAsync();

        return new OfferStatsResponse
        {
            TotalOffers = offers.Count,
            PendingOffers = offers.Count(o => o.Status == OfferStatus.Pending),
            AcceptedOffers = offers.Count(o => o.Status == OfferStatus.Accepted),
            RejectedOffers = offers.Count(o => o.Status == OfferStatus.Rejected),
            AveragePrice = offers.Any() ? offers.Average(o => o.Price) : 0,
            AverageDeliveryDays = offers.Any() ? offers.Average(o => o.DeliveryDays) : 0
        };
    }

    public async Task<OfferStatsResponse> GetProviderOfferStatsAsync(string providerId)
    {
        var offers = await _context.Offers
            .Where(o => o.ProviderId == providerId)
            .ToListAsync();

        return new OfferStatsResponse
        {
            TotalOffers = offers.Count,
            PendingOffers = offers.Count(o => o.Status == OfferStatus.Pending),
            AcceptedOffers = offers.Count(o => o.Status == OfferStatus.Accepted),
            RejectedOffers = offers.Count(o => o.Status == OfferStatus.Rejected),
            AveragePrice = offers.Any() ? offers.Average(o => o.Price) : 0,
            AverageDeliveryDays = offers.Any() ? offers.Average(o => o.DeliveryDays) : 0
        };
    }

    public async Task<List<OfferResponse>> GetTopOffersForNeedAsync(int needId, int maxResults = 5)
    {
        var offers = await _context.Offers
            .Include(o => o.Need)
            .Include(o => o.Provider)
            .Include(o => o.Images)
            .Include(o => o.Messages)
            .Where(o => o.NeedId == needId && o.Status == OfferStatus.Pending)
            .OrderBy(o => o.Price)
            .ThenBy(o => o.DeliveryDays)
            .ThenByDescending(o => o.Provider.Rating)
            .Take(maxResults)
            .ToListAsync();

        return offers.Select(o => MapToOfferResponse(o)).ToList();
    }

    public async Task NotifyNewOfferAsync(int offerId)
    {
        var offer = await _context.Offers
            .Include(o => o.Need)
            .FirstOrDefaultAsync(o => o.Id == offerId);

        if (offer != null)
        {
            await _notificationService.NotifyNewOfferAsync(offer.Need.UserId, offer.NeedId, offerId);
        }
    }

    public async Task NotifyOfferStatusChangeAsync(int offerId, OfferStatus newStatus)
    {
        var offer = await _context.Offers
            .Include(o => o.Need)
            .FirstOrDefaultAsync(o => o.Id == offerId);

        if (offer == null) return;

        switch (newStatus)
        {
            case OfferStatus.Accepted:
                await _notificationService.NotifyOfferAcceptedAsync(offer.ProviderId, offerId);
                break;
            case OfferStatus.Rejected:
                await _notificationService.NotifyOfferRejectedAsync(offer.ProviderId, offerId);
                break;
            case OfferStatus.Withdrawn:
                await _notificationService.NotifyOfferWithdrawnAsync(offer.Need.UserId, offerId);
                break;
        }
    }

    private OfferResponse MapToOfferResponse(Offer offer, string? userId = null)
    {
        return new OfferResponse
        {
            Id = offer.Id,
            NeedId = offer.NeedId,
            NeedTitle = offer.Need?.Title ?? string.Empty,
            ProviderId = offer.ProviderId,
            ProviderName = $"{offer.Provider?.FirstName} {offer.Provider?.LastName}".Trim(),
            ProviderProfileImageUrl = offer.Provider?.ProfileImageUrl,
            ProviderRating = offer.Provider?.Rating ?? 0,
            ProviderReviewCount = offer.Provider?.ReviewCount ?? 0,
            Price = offer.Price,
            Currency = offer.Currency,
            Description = offer.Description,
            DeliveryDays = offer.DeliveryDays,
            Status = offer.Status,
            CreatedAt = offer.CreatedAt,
            UpdatedAt = offer.UpdatedAt,
            Images = offer.Images?.Select(i => new OfferImageResponse
            {
                Id = i.Id,
                ImageUrl = i.ImageUrl,
                AltText = i.AltText,
                SortOrder = i.SortOrder
            }).OrderBy(i => i.SortOrder).ToList() ?? new List<OfferImageResponse>(),
            MessageCount = offer.Messages?.Count ?? 0,
            HasUnreadMessages = userId != null && offer.Messages?.Any(m => !m.IsRead && m.SenderId != userId) == true
        };
    }
}