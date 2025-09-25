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

    public NeedService(ApplicationDbContext context, IFileStorageService fileStorageService)
    {
        _context = context;
        _fileStorageService = fileStorageService;
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

        var need = new Need
        {
            Title = request.Title,
            Description = request.Description,
            CategoryId = request.CategoryId,
            MinBudget = request.MinBudget,
            MaxBudget = request.MaxBudget,
            Currency = request.Currency,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Address = request.Address,
            Urgency = request.Urgency,
            Status = NeedStatus.Active,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ExpiresAt = request.ExpiresAt
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

    public async Task<PagedResult<NeedResponse>> GetNeedsAsync(NeedFilterRequest filter)
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
            query = query.Where(n => n.CategoryId == filter.CategoryId.Value);
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

        if (filter.Status.HasValue)
        {
            query = query.Where(n => n.Status == filter.Status.Value);
        }
        else
        {
            // Default to active needs only
            query = query.Where(n => n.Status == NeedStatus.Active);
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
        query = filter.SortBy?.ToLower() switch
        {
            "title" => filter.SortDescending ? query.OrderByDescending(n => n.Title) : query.OrderBy(n => n.Title),
            "budget" => filter.SortDescending ? query.OrderByDescending(n => n.MaxBudget ?? n.MinBudget ?? 0) : query.OrderBy(n => n.MaxBudget ?? n.MinBudget ?? 0),
            "urgency" => filter.SortDescending ? query.OrderByDescending(n => n.Urgency) : query.OrderBy(n => n.Urgency),
            "updatedat" => filter.SortDescending ? query.OrderByDescending(n => n.UpdatedAt) : query.OrderBy(n => n.UpdatedAt),
            _ => filter.SortDescending ? query.OrderByDescending(n => n.CreatedAt) : query.OrderBy(n => n.CreatedAt)
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
            .FirstOrDefaultAsync(n => n.Id == needId);

        if (need == null)
        {
            return null;
        }

        return MapToNeedResponse(need);
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

        // Validate budget range
        if (need.MinBudget.HasValue && need.MaxBudget.HasValue && need.MinBudget > need.MaxBudget)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Budget", new[] { "Minimum bütçe maksimum bütçeden büyük olamaz." } }
            });
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

        if (request.Urgency.HasValue)
        {
            need.Urgency = request.Urgency.Value;
        }

        if (request.Status.HasValue)
        {
            need.Status = request.Status.Value;
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

        return await GetNeedByIdAsync(needId, userId);
    }

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

    public async Task<PagedResult<NeedResponse>> GetUserNeedsAsync(string userId, NeedStatus? status = null, int page = 1, int pageSize = 20)
    {
        var filter = new NeedFilterRequest
        {
            UserId = userId,
            Status = status,
            Page = page,
            PageSize = pageSize
        };

        return await GetNeedsAsync(filter);
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
            OfferCount = need.Offers?.Count ?? 0
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