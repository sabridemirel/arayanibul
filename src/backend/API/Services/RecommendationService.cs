using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using API.Data;
using API.Interfaces;
using API.Models;

namespace API.Services;

public class RecommendationService : IRecommendationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<RecommendationService> _logger;

    public RecommendationService(ApplicationDbContext context, ILogger<RecommendationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<RecommendationResponse>> GetPersonalizedRecommendationsAsync(RecommendationRequest request)
    {
        var recommendations = new List<RecommendationResponse>();

        try
        {
            if (string.IsNullOrEmpty(request.UserId))
            {
                // For anonymous users, return popular and location-based recommendations
                return await GetAnonymousRecommendationsAsync(request);
            }

            var userProfile = await GetUserInterestProfileAsync(request.UserId);
            
            // Get behavior-based recommendations
            var behaviorRecommendations = await GetBehaviorBasedRecommendationsAsync(request, userProfile);
            recommendations.AddRange(behaviorRecommendations);

            // Get similar user recommendations
            var similarUserRecommendations = await GetSimilarUserRecommendationsInternalAsync(request);
            recommendations.AddRange(similarUserRecommendations);

            // Get category-based recommendations from user interests
            var categoryRecommendations = await GetCategoryBasedRecommendationsInternalAsync(request, userProfile);
            recommendations.AddRange(categoryRecommendations);

            // Get location-based recommendations if location is provided
            if (request.Latitude.HasValue && request.Longitude.HasValue)
            {
                var locationRecommendations = await GetLocationBasedRecommendationsInternalAsync(request);
                recommendations.AddRange(locationRecommendations);
            }

            // Sort by score and take top results
            return recommendations
                .OrderByDescending(r => r.Score)
                .Take(request.MaxResults)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting personalized recommendations for user: {UserId}", request.UserId);
            return new List<RecommendationResponse>();
        }
    }

    public async Task<PopularNeedsResponse> GetPopularNeedsAsync(int maxResults = 20, int daysBack = 7)
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-daysBack);

            // Get needs with most activity (views, offers, messages)
            var popularNeeds = await _context.Needs
                .Include(n => n.User)
                .Include(n => n.Category)
                .Include(n => n.Images)
                .Include(n => n.Offers)
                .Where(n => n.Status == NeedStatus.Active && n.CreatedAt >= cutoffDate)
                .Select(n => new
                {
                    Need = n,
                    ActivityScore = CalculateActivityScore(n)
                })
                .OrderByDescending(x => x.ActivityScore)
                .Take(maxResults)
                .ToListAsync();

            var needResponses = popularNeeds.Select(x => MapToNeedResponse(x.Need)).ToList();

            var categoryBreakdown = needResponses
                .GroupBy(n => n.CategoryName)
                .ToDictionary(g => g.Key, g => g.Count());

            var locationBreakdown = needResponses
                .Where(n => !string.IsNullOrEmpty(n.Address))
                .GroupBy(n => ExtractCityFromAddress(n.Address!))
                .Where(g => !string.IsNullOrEmpty(g.Key))
                .ToDictionary(g => g.Key, g => g.Count());

            return new PopularNeedsResponse
            {
                PopularNeeds = needResponses,
                Period = $"Son {daysBack} gün",
                CategoryBreakdown = categoryBreakdown,
                LocationBreakdown = locationBreakdown
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular needs");
            return new PopularNeedsResponse();
        }
    }

    public async Task<LocationBasedRecommendationResponse> GetLocationBasedRecommendationsAsync(double latitude, double longitude, double radiusKm = 25, int maxResults = 20)
    {
        try
        {
            var needs = await _context.Needs
                .Include(n => n.User)
                .Include(n => n.Category)
                .Include(n => n.Images)
                .Include(n => n.Offers)
                .Where(n => n.Status == NeedStatus.Active && n.Latitude.HasValue && n.Longitude.HasValue)
                .ToListAsync();

            var nearbyNeeds = needs
                .Select(n => new
                {
                    Need = n,
                    Distance = CalculateDistance(latitude, longitude, n.Latitude!.Value, n.Longitude!.Value)
                })
                .Where(x => x.Distance <= radiusKm)
                .OrderBy(x => x.Distance)
                .Take(maxResults)
                .Select(x => MapToNeedResponse(x.Need, latitude, longitude))
                .ToList();

            var distanceBreakdown = nearbyNeeds
                .GroupBy(n => GetDistanceRange(n.DistanceKm ?? 0))
                .ToDictionary(g => g.Key, g => g.Count());

            return new LocationBasedRecommendationResponse
            {
                NearbyNeeds = nearbyNeeds,
                CenterLatitude = latitude,
                CenterLongitude = longitude,
                RadiusKm = radiusKm,
                DistanceBreakdown = distanceBreakdown
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting location-based recommendations");
            return new LocationBasedRecommendationResponse();
        }
    }

    public async Task<List<NeedResponse>> GetTrendingNeedsAsync(int maxResults = 20)
    {
        try
        {
            var last24Hours = DateTime.UtcNow.AddHours(-24);
            var last7Days = DateTime.UtcNow.AddDays(-7);

            // Get needs that have gained significant activity in the last 24 hours compared to the previous period
            var trendingNeeds = await _context.Needs
                .Include(n => n.User)
                .Include(n => n.Category)
                .Include(n => n.Images)
                .Include(n => n.Offers)
                .Where(n => n.Status == NeedStatus.Active && n.CreatedAt >= last7Days)
                .Select(n => new
                {
                    Need = n,
                    RecentActivity = n.Offers.Count(o => o.CreatedAt >= last24Hours),
                    TotalActivity = n.Offers.Count,
                    TrendScore = CalculateTrendScore(n, last24Hours)
                })
                .Where(x => x.TrendScore > 0)
                .OrderByDescending(x => x.TrendScore)
                .Take(maxResults)
                .ToListAsync();

            return trendingNeeds.Select(x => MapToNeedResponse(x.Need)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trending needs");
            return new List<NeedResponse>();
        }
    }

    public async Task<List<NeedResponse>> GetCategoryBasedRecommendationsAsync(List<int> categoryIds, int maxResults = 20)
    {
        try
        {
            // Include subcategories
            var allCategoryIds = await GetCategoryIdsWithSubcategoriesAsync(categoryIds);

            var needs = await _context.Needs
                .Include(n => n.User)
                .Include(n => n.Category)
                .Include(n => n.Images)
                .Include(n => n.Offers)
                .Where(n => n.Status == NeedStatus.Active && allCategoryIds.Contains(n.CategoryId))
                .OrderByDescending(n => n.CreatedAt)
                .Take(maxResults)
                .ToListAsync();

            return needs.Select(n => MapToNeedResponse(n)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting category-based recommendations");
            return new List<NeedResponse>();
        }
    }

    public async Task TrackUserBehaviorAsync(string userId, UserActionType actionType, string? targetId = null, string? targetType = null, object? metadata = null, string? ipAddress = null, string? userAgent = null)
    {
        try
        {
            var behavior = new UserBehavior
            {
                UserId = userId,
                ActionType = actionType,
                TargetId = targetId,
                TargetType = targetType,
                Metadata = metadata != null ? JsonSerializer.Serialize(metadata) : null,
                CreatedAt = DateTime.UtcNow,
                IpAddress = ipAddress,
                UserAgent = userAgent
            };

            _context.UserBehaviors.Add(behavior);
            await _context.SaveChangesAsync();

            // Update user interest profile periodically
            var random = new Random();
            if (random.Next(1, 11) == 1) // 10% chance to update profile
            {
                await UpdateUserInterestProfileAsync(userId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking user behavior for user: {UserId}", userId);
            // Don't throw - behavior tracking is not critical
        }
    }

    public async Task<UserInterestProfile> GetUserInterestProfileAsync(string userId)
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-30); // Last 30 days of behavior

            var behaviors = await _context.UserBehaviors
                .Where(b => b.UserId == userId && b.CreatedAt >= cutoffDate)
                .ToListAsync();

            var profile = new UserInterestProfile
            {
                UserId = userId,
                LastUpdated = DateTime.UtcNow,
                TotalActions = behaviors.Count
            };

            // Calculate category interests
            var categoryInterests = new Dictionary<int, double>();
            foreach (var behavior in behaviors.Where(b => b.TargetType == "need"))
            {
                if (int.TryParse(behavior.TargetId, out var needId))
                {
                    var need = await _context.Needs.FindAsync(needId);
                    if (need != null)
                    {
                        var weight = GetActionWeight(behavior.ActionType);
                        categoryInterests[need.CategoryId] = categoryInterests.GetValueOrDefault(need.CategoryId, 0) + weight;
                    }
                }
            }
            profile.CategoryInterests = categoryInterests;

            // Calculate keyword interests from search behavior
            var keywordInterests = new Dictionary<string, double>();
            foreach (var behavior in behaviors.Where(b => b.ActionType == UserActionType.Search))
            {
                if (!string.IsNullOrEmpty(behavior.Metadata))
                {
                    try
                    {
                        var searchData = JsonSerializer.Deserialize<Dictionary<string, object>>(behavior.Metadata);
                        if (searchData?.ContainsKey("searchText") == true)
                        {
                            var searchText = searchData["searchText"].ToString()?.ToLower();
                            if (!string.IsNullOrEmpty(searchText))
                            {
                                var keywords = searchText.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                                foreach (var keyword in keywords.Where(k => k.Length > 2))
                                {
                                    keywordInterests[keyword] = keywordInterests.GetValueOrDefault(keyword, 0) + 1;
                                }
                            }
                        }
                    }
                    catch
                    {
                        // Ignore JSON parsing errors
                    }
                }
            }
            profile.KeywordInterests = keywordInterests;

            return profile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user interest profile for user: {UserId}", userId);
            return new UserInterestProfile { UserId = userId };
        }
    }

    public async Task UpdateUserInterestProfileAsync(string userId)
    {
        try
        {
            // This method would typically update a cached user profile
            // For now, we'll just log that it was called
            _logger.LogInformation("Updating user interest profile for user: {UserId}", userId);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user interest profile for user: {UserId}", userId);
        }
    }

    public async Task<List<string>> GetSimilarUsersAsync(string userId, int maxResults = 10)
    {
        try
        {
            var userProfile = await GetUserInterestProfileAsync(userId);
            var allUsers = await _context.UserBehaviors
                .Where(b => b.UserId != userId)
                .Select(b => b.UserId)
                .Distinct()
                .Take(100) // Limit for performance
                .ToListAsync();

            var similarities = new List<(string UserId, double Similarity)>();

            foreach (var otherUserId in allUsers)
            {
                var otherProfile = await GetUserInterestProfileAsync(otherUserId);
                var similarity = CalculateUserSimilarity(userProfile, otherProfile);
                if (similarity > 0.1) // Minimum similarity threshold
                {
                    similarities.Add((otherUserId, similarity));
                }
            }

            return similarities
                .OrderByDescending(s => s.Similarity)
                .Take(maxResults)
                .Select(s => s.UserId)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting similar users for user: {UserId}", userId);
            return new List<string>();
        }
    }

    public async Task<List<NeedResponse>> GetSimilarUserRecommendationsAsync(string userId, int maxResults = 20)
    {
        try
        {
            var similarUsers = await GetSimilarUsersAsync(userId, 5);
            if (!similarUsers.Any())
            {
                return new List<NeedResponse>();
            }

            // Get needs that similar users have interacted with
            var cutoffDate = DateTime.UtcNow.AddDays(-14);
            var similarUserBehaviors = await _context.UserBehaviors
                .Where(b => similarUsers.Contains(b.UserId) && 
                           b.CreatedAt >= cutoffDate && 
                           b.TargetType == "need")
                .GroupBy(b => b.TargetId)
                .Select(g => new { NeedId = g.Key, InteractionCount = g.Count() })
                .OrderByDescending(x => x.InteractionCount)
                .Take(maxResults)
                .ToListAsync();

            var needIds = similarUserBehaviors
                .Where(x => int.TryParse(x.NeedId, out _))
                .Select(x => int.Parse(x.NeedId!))
                .ToList();

            var needs = await _context.Needs
                .Include(n => n.User)
                .Include(n => n.Category)
                .Include(n => n.Images)
                .Include(n => n.Offers)
                .Where(n => needIds.Contains(n.Id) && n.Status == NeedStatus.Active)
                .ToListAsync();

            return needs.Select(n => MapToNeedResponse(n)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting similar user recommendations for user: {UserId}", userId);
            return new List<NeedResponse>();
        }
    }

    private async Task<List<RecommendationResponse>> GetAnonymousRecommendationsAsync(RecommendationRequest request)
    {
        var recommendations = new List<RecommendationResponse>();

        // Get popular needs
        var popularNeeds = await GetPopularNeedsAsync(request.MaxResults / 2);
        recommendations.AddRange(popularNeeds.PopularNeeds.Select(n => new RecommendationResponse
        {
            Recommendations = new List<NeedResponse> { n },
            RecommendationType = "Popular",
            Reason = "Popüler ihtiyaçlar",
            Score = 0.8
        }));

        // Get location-based if location provided
        if (request.Latitude.HasValue && request.Longitude.HasValue)
        {
            var locationNeeds = await GetLocationBasedRecommendationsAsync(
                request.Latitude.Value, request.Longitude.Value, request.RadiusKm ?? 25, request.MaxResults / 2);
            
            recommendations.AddRange(locationNeeds.NearbyNeeds.Select(n => new RecommendationResponse
            {
                Recommendations = new List<NeedResponse> { n },
                RecommendationType = "Location",
                Reason = "Yakınınızdaki ihtiyaçlar",
                Score = 0.7
            }));
        }

        return recommendations.Take(request.MaxResults).ToList();
    }

    private async Task<List<RecommendationResponse>> GetBehaviorBasedRecommendationsAsync(RecommendationRequest request, UserInterestProfile userProfile)
    {
        var recommendations = new List<RecommendationResponse>();

        if (!userProfile.CategoryInterests.Any())
        {
            return recommendations;
        }

        var topCategories = userProfile.CategoryInterests
            .OrderByDescending(kv => kv.Value)
            .Take(3)
            .Select(kv => kv.Key)
            .ToList();

        var categoryNeeds = await GetCategoryBasedRecommendationsAsync(topCategories, 10);
        
        recommendations.AddRange(categoryNeeds.Select(n => new RecommendationResponse
        {
            Recommendations = new List<NeedResponse> { n },
            RecommendationType = "Behavior",
            Reason = "İlgi alanlarınıza göre",
            Score = 0.9
        }));

        return recommendations;
    }

    private async Task<List<RecommendationResponse>> GetSimilarUserRecommendationsInternalAsync(RecommendationRequest request)
    {
        if (string.IsNullOrEmpty(request.UserId))
        {
            return new List<RecommendationResponse>();
        }

        var similarUserNeeds = await GetSimilarUserRecommendationsAsync(request.UserId, 5);
        
        return similarUserNeeds.Select(n => new RecommendationResponse
        {
            Recommendations = new List<NeedResponse> { n },
            RecommendationType = "SimilarUsers",
            Reason = "Benzer kullanıcıların ilgilendiği",
            Score = 0.75
        }).ToList();
    }

    private async Task<List<RecommendationResponse>> GetCategoryBasedRecommendationsInternalAsync(RecommendationRequest request, UserInterestProfile userProfile)
    {
        if (!userProfile.CategoryInterests.Any())
        {
            return new List<RecommendationResponse>();
        }

        var topCategory = userProfile.CategoryInterests.OrderByDescending(kv => kv.Value).First().Key;
        var categoryNeeds = await GetCategoryBasedRecommendationsAsync(new List<int> { topCategory }, 5);
        
        return categoryNeeds.Select(n => new RecommendationResponse
        {
            Recommendations = new List<NeedResponse> { n },
            RecommendationType = "Category",
            Reason = "İlgilendiğiniz kategoriden",
            Score = 0.7
        }).ToList();
    }

    private async Task<List<RecommendationResponse>> GetLocationBasedRecommendationsInternalAsync(RecommendationRequest request)
    {
        if (!request.Latitude.HasValue || !request.Longitude.HasValue)
        {
            return new List<RecommendationResponse>();
        }

        var locationResponse = await GetLocationBasedRecommendationsAsync(
            request.Latitude.Value, request.Longitude.Value, request.RadiusKm ?? 25, 5);
        
        return locationResponse.NearbyNeeds.Select(n => new RecommendationResponse
        {
            Recommendations = new List<NeedResponse> { n },
            RecommendationType = "Location",
            Reason = "Yakınınızda",
            Score = 0.6
        }).ToList();
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

    private static int CalculateActivityScore(Need need)
    {
        var score = 0;
        score += need.Offers?.Count ?? 0 * 10; // Offers are most important
        score += need.Urgency == UrgencyLevel.Urgent ? 20 : 0;
        score += (need.MinBudget.HasValue || need.MaxBudget.HasValue) ? 5 : 0;
        score += (need.Latitude.HasValue && need.Longitude.HasValue) ? 3 : 0;
        
        // Recency bonus
        var daysSinceCreated = (DateTime.UtcNow - need.CreatedAt).TotalDays;
        if (daysSinceCreated <= 1) score += 15;
        else if (daysSinceCreated <= 3) score += 10;
        else if (daysSinceCreated <= 7) score += 5;
        
        return score;
    }

    private static double CalculateTrendScore(Need need, DateTime cutoffTime)
    {
        var recentOffers = need.Offers?.Count(o => o.CreatedAt >= cutoffTime) ?? 0;
        var totalOffers = need.Offers?.Count ?? 0;
        
        if (totalOffers == 0) return 0;
        
        var recentRatio = (double)recentOffers / totalOffers;
        var recencyBonus = (DateTime.UtcNow - need.CreatedAt).TotalDays <= 3 ? 1.5 : 1.0;
        
        return recentRatio * recentOffers * recencyBonus;
    }

    private static double GetActionWeight(UserActionType actionType)
    {
        return actionType switch
        {
            UserActionType.ViewNeed => 1.0,
            UserActionType.CreateOffer => 5.0,
            UserActionType.ContactProvider => 3.0,
            UserActionType.AcceptOffer => 10.0,
            UserActionType.SaveNeed => 2.0,
            UserActionType.ShareNeed => 2.0,
            UserActionType.Search => 0.5,
            _ => 1.0
        };
    }

    private static double CalculateUserSimilarity(UserInterestProfile profile1, UserInterestProfile profile2)
    {
        if (!profile1.CategoryInterests.Any() || !profile2.CategoryInterests.Any())
        {
            return 0;
        }

        var commonCategories = profile1.CategoryInterests.Keys.Intersect(profile2.CategoryInterests.Keys);
        if (!commonCategories.Any())
        {
            return 0;
        }

        var similarity = 0.0;
        var totalWeight = 0.0;

        foreach (var categoryId in commonCategories)
        {
            var weight1 = profile1.CategoryInterests[categoryId];
            var weight2 = profile2.CategoryInterests[categoryId];
            var categoryWeight = Math.Min(weight1, weight2);
            
            similarity += categoryWeight;
            totalWeight += Math.Max(weight1, weight2);
        }

        return totalWeight > 0 ? similarity / totalWeight : 0;
    }

    private static string GetDistanceRange(double distanceKm)
    {
        return distanceKm switch
        {
            <= 1 => "1 km içinde",
            <= 5 => "1-5 km",
            <= 10 => "5-10 km",
            <= 25 => "10-25 km",
            _ => "25+ km"
        };
    }

    private static string ExtractCityFromAddress(string address)
    {
        var parts = address.Split(',', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 1 ? parts[^1].Trim() : "";
    }

    private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
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

        if (userLatitude.HasValue && userLongitude.HasValue && 
            need.Latitude.HasValue && need.Longitude.HasValue)
        {
            response.DistanceKm = CalculateDistance(
                userLatitude.Value, userLongitude.Value,
                need.Latitude.Value, need.Longitude.Value);
        }

        return response;
    }
}