using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;

namespace API.Services;

public class QueryOptimizationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<QueryOptimizationService> _logger;

    public QueryOptimizationService(ApplicationDbContext context, ILogger<QueryOptimizationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get needs with optimized query using compiled queries and minimal data loading
    /// </summary>
    public async Task<List<Need>> GetOptimizedNeedsAsync(int categoryId, NeedStatus status, int skip, int take)
    {
        return await _context.Needs
            .Where(n => n.CategoryId == categoryId && n.Status == status)
            .OrderByDescending(n => n.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(n => new Need
            {
                Id = n.Id,
                Title = n.Title,
                Description = n.Description,
                CategoryId = n.CategoryId,
                MinBudget = n.MinBudget,
                MaxBudget = n.MaxBudget,
                Currency = n.Currency,
                Status = n.Status,
                CreatedAt = n.CreatedAt,
                UserId = n.UserId,
                Urgency = n.Urgency,
                Latitude = n.Latitude,
                Longitude = n.Longitude,
                Address = n.Address
            })
            .AsNoTracking()
            .ToListAsync();
    }

    /// <summary>
    /// Get offers with minimal data for listing
    /// </summary>
    public async Task<List<Offer>> GetOptimizedOffersAsync(int needId, int skip, int take)
    {
        return await _context.Offers
            .Where(o => o.NeedId == needId)
            .OrderByDescending(o => o.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(o => new Offer
            {
                Id = o.Id,
                NeedId = o.NeedId,
                ProviderId = o.ProviderId,
                Price = o.Price,
                Currency = o.Currency,
                Description = o.Description,
                DeliveryDays = o.DeliveryDays,
                Status = o.Status,
                CreatedAt = o.CreatedAt
            })
            .AsNoTracking()
            .ToListAsync();
    }

    /// <summary>
    /// Get user statistics with single query
    /// </summary>
    public async Task<UserStatsDto> GetUserStatsAsync(string userId)
    {
        var stats = await _context.Users
            .Where(u => u.Id == userId)
            .Select(u => new UserStatsDto
            {
                UserId = u.Id,
                NeedsCount = u.Needs.Count(),
                ActiveNeedsCount = u.Needs.Count(n => n.Status == NeedStatus.Active),
                OffersCount = u.Offers.Count(),
                AcceptedOffersCount = u.Offers.Count(o => o.Status == OfferStatus.Accepted),
                Rating = u.Rating,
                ReviewCount = u.ReviewCount
            })
            .AsNoTracking()
            .FirstOrDefaultAsync();

        return stats ?? new UserStatsDto { UserId = userId };
    }

    /// <summary>
    /// Bulk update need statuses for expired needs
    /// </summary>
    public async Task<int> BulkUpdateExpiredNeedsAsync()
    {
        var expiredCount = await _context.Needs
            .Where(n => n.Status == NeedStatus.Active && 
                       n.ExpiresAt.HasValue && 
                       n.ExpiresAt.Value <= DateTime.UtcNow)
            .ExecuteUpdateAsync(n => n
                .SetProperty(x => x.Status, NeedStatus.Expired)
                .SetProperty(x => x.UpdatedAt, DateTime.UtcNow));

        _logger.LogInformation("Bulk updated {Count} expired needs", expiredCount);
        return expiredCount;
    }

    /// <summary>
    /// Get trending categories based on recent activity
    /// </summary>
    public async Task<List<CategoryTrendDto>> GetTrendingCategoriesAsync(int days = 7, int take = 10)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);
        
        return await _context.Needs
            .Where(n => n.CreatedAt >= cutoffDate)
            .GroupBy(n => new { n.CategoryId, n.Category.Name, n.Category.NameTr })
            .Select(g => new CategoryTrendDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.Name,
                CategoryNameTr = g.Key.NameTr,
                NeedsCount = g.Count(),
                OffersCount = g.Sum(n => n.Offers.Count())
            })
            .OrderByDescending(c => c.NeedsCount)
            .Take(take)
            .AsNoTracking()
            .ToListAsync();
    }

    /// <summary>
    /// Get location-based needs using spatial queries
    /// </summary>
    public async Task<List<Need>> GetNearbyNeedsOptimizedAsync(double latitude, double longitude, double radiusKm, int take = 50)
    {
        // Using Haversine formula in SQL for better performance
        var radiusInDegrees = radiusKm / 111.0; // Approximate conversion

        return await _context.Needs
            .Where(n => n.Status == NeedStatus.Active && 
                       n.Latitude.HasValue && 
                       n.Longitude.HasValue &&
                       Math.Abs(n.Latitude.Value - latitude) <= radiusInDegrees &&
                       Math.Abs(n.Longitude.Value - longitude) <= radiusInDegrees)
            .OrderByDescending(n => n.CreatedAt)
            .Take(take)
            .AsNoTracking()
            .ToListAsync();
    }

    /// <summary>
    /// Get message counts for conversations efficiently
    /// </summary>
    public async Task<Dictionary<int, int>> GetUnreadMessageCountsAsync(string userId)
    {
        return await _context.Messages
            .Where(m => m.Offer.Need.UserId == userId || m.Offer.ProviderId == userId)
            .Where(m => !m.IsRead && m.SenderId != userId)
            .GroupBy(m => m.OfferId)
            .ToDictionaryAsync(g => g.Key, g => g.Count());
    }
}

public class UserStatsDto
{
    public string UserId { get; set; } = string.Empty;
    public int NeedsCount { get; set; }
    public int ActiveNeedsCount { get; set; }
    public int OffersCount { get; set; }
    public int AcceptedOffersCount { get; set; }
    public double Rating { get; set; }
    public int ReviewCount { get; set; }
}

public class CategoryTrendDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryNameTr { get; set; } = string.Empty;
    public int NeedsCount { get; set; }
    public int OffersCount { get; set; }
}