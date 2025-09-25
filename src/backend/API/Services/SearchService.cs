using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.Text.Json;
using API.Data;
using API.Interfaces;
using API.Models;

namespace API.Services;

public class SearchService : ISearchService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SearchService> _logger;

    public SearchService(ApplicationDbContext context, ILogger<SearchService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<SearchResponse> AdvancedSearchAsync(AdvancedSearchRequest request, string? userId = null, string? ipAddress = null, string? userAgent = null)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            var query = _context.Needs
                .Include(n => n.User)
                .Include(n => n.Category)
                .Include(n => n.Images)
                .Include(n => n.Offers)
                .AsQueryable();

            // Apply status filter
            if (!request.IncludeExpired)
            {
                query = query.Where(n => n.Status == NeedStatus.Active);
            }
            else
            {
                query = query.Where(n => n.Status != NeedStatus.Cancelled);
            }

            // Apply category filter
            if (request.CategoryIds != null && request.CategoryIds.Any())
            {
                // Include subcategories
                var allCategoryIds = await GetCategoryIdsWithSubcategoriesAsync(request.CategoryIds);
                query = query.Where(n => allCategoryIds.Contains(n.CategoryId));
            }

            // Apply budget filter
            if (request.MinBudget.HasValue || request.MaxBudget.HasValue)
            {
                query = ApplyBudgetFilter(query, request.MinBudget, request.MaxBudget, request.Currency);
            }

            // Apply location filter (pre-filter)
            if (request.Latitude.HasValue && request.Longitude.HasValue && request.RadiusKm.HasValue)
            {
                query = query.Where(n => n.Latitude.HasValue && n.Longitude.HasValue);
            }

            // Apply urgency filter
            if (request.Urgency.HasValue)
            {
                query = query.Where(n => n.Urgency == request.Urgency.Value);
            }

            // Apply date filters
            if (request.CreatedAfter.HasValue)
            {
                query = query.Where(n => n.CreatedAt >= request.CreatedAfter.Value);
            }

            if (request.CreatedBefore.HasValue)
            {
                query = query.Where(n => n.CreatedAt <= request.CreatedBefore.Value);
            }

            // Get all matching needs for full-text search and ranking
            var allNeeds = await query.ToListAsync();

            // Apply full-text search and calculate relevance scores
            var searchResults = PerformFullTextSearch(allNeeds, request.SearchText, request.Latitude, request.Longitude);

            // Apply location-based filtering after distance calculation
            if (request.Latitude.HasValue && request.Longitude.HasValue && request.RadiusKm.HasValue)
            {
                searchResults = searchResults
                    .Where(r => r.DistanceKm.HasValue && r.DistanceKm.Value <= request.RadiusKm.Value)
                    .ToList();
            }

            // Apply sorting
            searchResults = ApplySorting(searchResults, request.SortBy, request.SortDescending);

            // Get total count before pagination
            var totalCount = searchResults.Count;

            // Apply pagination
            var pagedResults = searchResults
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToList();

            // Generate suggestions
            var suggestions = await GetSearchSuggestionsAsync(request.SearchText);

            // Generate stats
            var stats = GenerateSearchStats(searchResults, stopwatch.ElapsedMilliseconds);

            // Save search history
            await SaveSearchHistoryAsync(request, totalCount, userId, ipAddress, userAgent);

            stopwatch.Stop();

            return new SearchResponse
            {
                Results = pagedResults,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize,
                SearchText = request.SearchText,
                AppliedFilters = BuildAppliedFilters(request),
                Suggestions = suggestions,
                Stats = stats
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing advanced search for query: {SearchText}", request.SearchText);
            throw;
        }
    }

    public async Task<List<SearchSuggestion>> GetSearchSuggestionsAsync(string query, int maxResults = 10)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
        {
            return new List<SearchSuggestion>();
        }

        var suggestions = new List<SearchSuggestion>();

        try
        {
            var queryLower = query.ToLower();

            // Category suggestions
            var categoryMatches = await _context.Categories
                .Where(c => c.IsActive && (
                    c.Name.ToLower().Contains(queryLower) || 
                    c.NameTr.ToLower().Contains(queryLower)))
                .Select(c => new { c.NameTr, c.Name })
                .Take(5)
                .ToListAsync();

            foreach (var category in categoryMatches)
            {
                var categoryName = !string.IsNullOrEmpty(category.NameTr) ? category.NameTr : category.Name;
                suggestions.Add(new SearchSuggestion
                {
                    Text = categoryName,
                    Type = "category",
                    Count = await _context.Needs.CountAsync(n => n.CategoryId == _context.Categories
                        .Where(c => c.NameTr == categoryName || c.Name == categoryName)
                        .Select(c => c.Id)
                        .FirstOrDefault())
                });
            }

            // Popular search terms from history
            var popularSearches = await _context.SearchHistories
                .Where(sh => sh.SearchText.ToLower().Contains(queryLower) && 
                           sh.CreatedAt >= DateTime.UtcNow.AddDays(-30))
                .GroupBy(sh => sh.SearchText.ToLower())
                .Select(g => new { SearchText = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(5)
                .ToListAsync();

            foreach (var search in popularSearches)
            {
                if (!suggestions.Any(s => s.Text.ToLower() == search.SearchText))
                {
                    suggestions.Add(new SearchSuggestion
                    {
                        Text = search.SearchText,
                        Type = "keyword",
                        Count = search.Count
                    });
                }
            }

            // Location suggestions (if query looks like a location)
            if (query.Length > 3)
            {
                var locationMatches = await _context.Needs
                    .Where(n => n.Address != null && n.Address.ToLower().Contains(queryLower))
                    .GroupBy(n => n.Address!.ToLower())
                    .Select(g => new { Address = g.Key, Count = g.Count() })
                    .OrderByDescending(x => x.Count)
                    .Take(3)
                    .ToListAsync();

                foreach (var location in locationMatches)
                {
                    suggestions.Add(new SearchSuggestion
                    {
                        Text = location.Address,
                        Type = "location",
                        Count = location.Count
                    });
                }
            }

            return suggestions
                .OrderByDescending(s => s.Count)
                .Take(maxResults)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search suggestions for query: {Query}", query);
            return new List<SearchSuggestion>();
        }
    }

    public async Task<List<SearchHistoryResponse>> GetUserSearchHistoryAsync(string userId, int maxResults = 50)
    {
        try
        {
            var history = await _context.SearchHistories
                .Where(sh => sh.UserId == userId)
                .OrderByDescending(sh => sh.CreatedAt)
                .Take(maxResults)
                .ToListAsync();

            return history.Select(sh => new SearchHistoryResponse
            {
                Id = sh.Id,
                SearchText = sh.SearchText,
                Filters = string.IsNullOrEmpty(sh.Filters) 
                    ? new Dictionary<string, object>() 
                    : JsonSerializer.Deserialize<Dictionary<string, object>>(sh.Filters) ?? new Dictionary<string, object>(),
                ResultCount = sh.ResultCount,
                CreatedAt = sh.CreatedAt
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search history for user: {UserId}", userId);
            return new List<SearchHistoryResponse>();
        }
    }

    public async Task<List<PopularSearchResponse>> GetPopularSearchesAsync(int maxResults = 20, int daysBack = 30)
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-daysBack);

            var popularSearches = await _context.SearchHistories
                .Where(sh => sh.CreatedAt >= cutoffDate && !string.IsNullOrEmpty(sh.SearchText))
                .GroupBy(sh => sh.SearchText.ToLower())
                .Select(g => new PopularSearchResponse
                {
                    SearchText = g.Key,
                    SearchCount = g.Count(),
                    LastSearched = g.Max(sh => sh.CreatedAt)
                })
                .OrderByDescending(ps => ps.SearchCount)
                .Take(maxResults)
                .ToListAsync();

            return popularSearches;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular searches");
            return new List<PopularSearchResponse>();
        }
    }

    public async Task<bool> ClearUserSearchHistoryAsync(string userId)
    {
        try
        {
            var userHistory = await _context.SearchHistories
                .Where(sh => sh.UserId == userId)
                .ToListAsync();

            _context.SearchHistories.RemoveRange(userHistory);
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing search history for user: {UserId}", userId);
            return false;
        }
    }

    public async Task<Dictionary<string, object>> GetSearchAnalyticsAsync(DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            var from = fromDate ?? DateTime.UtcNow.AddDays(-30);
            var to = toDate ?? DateTime.UtcNow;

            var analytics = new Dictionary<string, object>();

            // Total searches
            var totalSearches = await _context.SearchHistories
                .Where(sh => sh.CreatedAt >= from && sh.CreatedAt <= to)
                .CountAsync();

            analytics["totalSearches"] = totalSearches;

            // Unique users
            var uniqueUsers = await _context.SearchHistories
                .Where(sh => sh.CreatedAt >= from && sh.CreatedAt <= to && sh.UserId != null)
                .Select(sh => sh.UserId)
                .Distinct()
                .CountAsync();

            analytics["uniqueUsers"] = uniqueUsers;

            // Top search terms
            var topSearches = await _context.SearchHistories
                .Where(sh => sh.CreatedAt >= from && sh.CreatedAt <= to)
                .GroupBy(sh => sh.SearchText.ToLower())
                .Select(g => new { SearchText = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToListAsync();

            analytics["topSearches"] = topSearches;

            // Average results per search
            var avgResults = await _context.SearchHistories
                .Where(sh => sh.CreatedAt >= from && sh.CreatedAt <= to)
                .AverageAsync(sh => (double)sh.ResultCount);

            analytics["averageResultsPerSearch"] = Math.Round(avgResults, 2);

            // Searches with no results
            var noResultSearches = await _context.SearchHistories
                .Where(sh => sh.CreatedAt >= from && sh.CreatedAt <= to && sh.ResultCount == 0)
                .CountAsync();

            analytics["noResultSearches"] = noResultSearches;
            analytics["noResultPercentage"] = totalSearches > 0 ? Math.Round((double)noResultSearches / totalSearches * 100, 2) : 0;

            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search analytics");
            return new Dictionary<string, object>();
        }
    }

    private async Task<List<int>> GetCategoryIdsWithSubcategoriesAsync(List<int> categoryIds)
    {
        var allIds = new List<int>(categoryIds);

        var subcategories = await _context.Categories
            .Where(c => categoryIds.Contains(c.ParentCategoryId ?? 0))
            .Select(c => c.Id)
            .ToListAsync();

        allIds.AddRange(subcategories);
        return allIds.Distinct().ToList();
    }

    private static IQueryable<Need> ApplyBudgetFilter(IQueryable<Need> query, decimal? minBudget, decimal? maxBudget, string? currency)
    {
        if (minBudget.HasValue || maxBudget.HasValue)
        {
            var currencyFilter = currency ?? "TRY";
            query = query.Where(n => n.Currency == currencyFilter);

            if (minBudget.HasValue && maxBudget.HasValue)
            {
                query = query.Where(n =>
                    // Need has no budget (open to offers)
                    (!n.MinBudget.HasValue && !n.MaxBudget.HasValue) ||
                    // Need's budget range overlaps with search range
                    (n.MinBudget.HasValue && n.MinBudget.Value <= maxBudget.Value) ||
                    (n.MaxBudget.HasValue && n.MaxBudget.Value >= minBudget.Value));
            }
            else if (minBudget.HasValue)
            {
                query = query.Where(n =>
                    (!n.MinBudget.HasValue && !n.MaxBudget.HasValue) ||
                    !n.MaxBudget.HasValue ||
                    n.MaxBudget.Value >= minBudget.Value);
            }
            else if (maxBudget.HasValue)
            {
                query = query.Where(n =>
                    (!n.MinBudget.HasValue && !n.MaxBudget.HasValue) ||
                    !n.MinBudget.HasValue ||
                    n.MinBudget.Value <= maxBudget.Value);
            }
        }

        return query;
    }

    private List<NeedResponse> PerformFullTextSearch(List<Need> needs, string searchText, double? userLatitude, double? userLongitude)
    {
        if (string.IsNullOrWhiteSpace(searchText))
        {
            return needs.Select(n => MapToNeedResponse(n, userLatitude, userLongitude)).ToList();
        }

        var searchTerms = searchText.ToLower()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(term => term.Length > 1)
            .ToArray();

        var scoredNeeds = needs.Select(need => new
        {
            Need = need,
            Score = CalculateAdvancedRelevanceScore(need, searchTerms, searchText.ToLower())
        })
        .Where(x => x.Score > 0)
        .OrderByDescending(x => x.Score)
        .Select(x => MapToNeedResponse(x.Need, userLatitude, userLongitude))
        .ToList();

        return scoredNeeds;
    }

    private static int CalculateAdvancedRelevanceScore(Need need, string[] searchTerms, string fullSearchText)
    {
        var score = 0;
        var title = need.Title.ToLower();
        var description = need.Description.ToLower();
        var categoryName = (need.Category?.Name ?? "").ToLower();
        var categoryNameTr = (need.Category?.NameTr ?? "").ToLower();
        var address = (need.Address ?? "").ToLower();

        // Exact phrase match gets highest score
        if (title.Contains(fullSearchText))
        {
            score += title == fullSearchText ? 50 : 30;
        }
        if (description.Contains(fullSearchText))
        {
            score += 20;
        }

        // Individual term matching
        foreach (var term in searchTerms)
        {
            // Title matches
            if (title.Contains(term))
            {
                score += title.StartsWith(term) ? 15 : 10;
                if (title.Split(' ').Contains(term))
                {
                    score += 5; // Whole word bonus
                }
            }

            // Category matches
            if (categoryName.Contains(term) || categoryNameTr.Contains(term))
            {
                score += 8;
            }

            // Description matches
            if (description.Contains(term))
            {
                score += 3;
                if (description.Split(' ').Contains(term))
                {
                    score += 2; // Whole word bonus
                }
            }

            // Address matches
            if (address.Contains(term))
            {
                score += 2;
            }
        }

        // Boost factors
        
        // Urgency boost
        score += need.Urgency switch
        {
            UrgencyLevel.Urgent => 10,
            UrgencyLevel.Normal => 5,
            UrgencyLevel.Flexible => 2,
            _ => 0
        };

        // Recency boost
        var daysSinceCreated = (DateTime.UtcNow - need.CreatedAt).TotalDays;
        if (daysSinceCreated <= 1)
        {
            score += 8;
        }
        else if (daysSinceCreated <= 3)
        {
            score += 5;
        }
        else if (daysSinceCreated <= 7)
        {
            score += 3;
        }

        // Offer activity boost
        var offerCount = need.Offers?.Count ?? 0;
        if (offerCount > 0)
        {
            score += Math.Min(offerCount * 2, 10); // Max 10 points from offers
        }

        // Budget specified boost (shows serious intent)
        if (need.MinBudget.HasValue || need.MaxBudget.HasValue)
        {
            score += 3;
        }

        // Location specified boost
        if (need.Latitude.HasValue && need.Longitude.HasValue)
        {
            score += 2;
        }

        return score;
    }

    private static List<NeedResponse> ApplySorting(List<NeedResponse> results, SearchSortBy sortBy, bool descending)
    {
        return sortBy switch
        {
            SearchSortBy.Relevance => results, // Already sorted by relevance
            SearchSortBy.CreatedAt => descending 
                ? results.OrderByDescending(r => r.CreatedAt).ToList()
                : results.OrderBy(r => r.CreatedAt).ToList(),
            SearchSortBy.UpdatedAt => descending
                ? results.OrderByDescending(r => r.UpdatedAt).ToList()
                : results.OrderBy(r => r.UpdatedAt).ToList(),
            SearchSortBy.Budget => descending
                ? results.OrderByDescending(r => r.MaxBudget ?? r.MinBudget ?? 0).ToList()
                : results.OrderBy(r => r.MaxBudget ?? r.MinBudget ?? 0).ToList(),
            SearchSortBy.Distance => descending
                ? results.OrderByDescending(r => r.DistanceKm ?? double.MaxValue).ToList()
                : results.OrderBy(r => r.DistanceKm ?? double.MaxValue).ToList(),
            SearchSortBy.Urgency => descending
                ? results.OrderByDescending(r => r.Urgency).ToList()
                : results.OrderBy(r => r.Urgency).ToList(),
            SearchSortBy.OfferCount => descending
                ? results.OrderByDescending(r => r.OfferCount).ToList()
                : results.OrderBy(r => r.OfferCount).ToList(),
            _ => results
        };
    }

    private static SearchStats GenerateSearchStats(List<NeedResponse> results, double searchTimeMs)
    {
        var stats = new SearchStats
        {
            TotalResults = results.Count,
            SearchTimeMs = Math.Round(searchTimeMs, 2)
        };

        // Category breakdown
        stats.CategoryBreakdown = results
            .GroupBy(r => r.CategoryName)
            .ToDictionary(g => g.Key, g => g.Count());

        // Urgency breakdown
        stats.UrgencyBreakdown = results
            .GroupBy(r => r.Urgency.ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        // Location breakdown (by city if available)
        stats.LocationBreakdown = results
            .Where(r => !string.IsNullOrEmpty(r.Address))
            .GroupBy(r => ExtractCityFromAddress(r.Address!))
            .Where(g => !string.IsNullOrEmpty(g.Key))
            .ToDictionary(g => g.Key, g => g.Count());

        return stats;
    }

    private static string ExtractCityFromAddress(string address)
    {
        // Simple city extraction - can be improved with proper address parsing
        var parts = address.Split(',', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 1 ? parts[^1].Trim() : "";
    }

    private static Dictionary<string, object> BuildAppliedFilters(AdvancedSearchRequest request)
    {
        var filters = new Dictionary<string, object>();

        if (request.CategoryIds != null && request.CategoryIds.Any())
        {
            filters["categoryIds"] = request.CategoryIds;
        }

        if (request.MinBudget.HasValue)
        {
            filters["minBudget"] = request.MinBudget.Value;
        }

        if (request.MaxBudget.HasValue)
        {
            filters["maxBudget"] = request.MaxBudget.Value;
        }

        if (!string.IsNullOrEmpty(request.Currency) && request.Currency != "TRY")
        {
            filters["currency"] = request.Currency;
        }

        if (request.Latitude.HasValue && request.Longitude.HasValue)
        {
            filters["location"] = new { lat = request.Latitude.Value, lng = request.Longitude.Value };
        }

        if (request.RadiusKm.HasValue)
        {
            filters["radiusKm"] = request.RadiusKm.Value;
        }

        if (request.Urgency.HasValue)
        {
            filters["urgency"] = request.Urgency.Value.ToString();
        }

        if (request.CreatedAfter.HasValue)
        {
            filters["createdAfter"] = request.CreatedAfter.Value;
        }

        if (request.CreatedBefore.HasValue)
        {
            filters["createdBefore"] = request.CreatedBefore.Value;
        }

        if (request.IncludeExpired)
        {
            filters["includeExpired"] = true;
        }

        return filters;
    }

    private async Task SaveSearchHistoryAsync(AdvancedSearchRequest request, int resultCount, string? userId, string? ipAddress, string? userAgent)
    {
        try
        {
            var searchHistory = new SearchHistory
            {
                UserId = userId,
                SearchText = request.SearchText,
                Filters = JsonSerializer.Serialize(BuildAppliedFilters(request)),
                ResultCount = resultCount,
                CreatedAt = DateTime.UtcNow,
                IpAddress = ipAddress,
                UserAgent = userAgent
            };

            _context.SearchHistories.Add(searchHistory);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving search history for query: {SearchText}", request.SearchText);
            // Don't throw - search history is not critical
        }
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
}