using API.Models;

namespace API.Interfaces;

public interface IRecommendationService
{
    /// <summary>
    /// Get personalized recommendations for a user
    /// </summary>
    Task<List<RecommendationResponse>> GetPersonalizedRecommendationsAsync(RecommendationRequest request);
    
    /// <summary>
    /// Get popular needs based on activity
    /// </summary>
    Task<PopularNeedsResponse> GetPopularNeedsAsync(int maxResults = 20, int daysBack = 7);
    
    /// <summary>
    /// Get location-based recommendations
    /// </summary>
    Task<LocationBasedRecommendationResponse> GetLocationBasedRecommendationsAsync(double latitude, double longitude, double radiusKm = 25, int maxResults = 20);
    
    /// <summary>
    /// Get trending needs (rapidly gaining popularity)
    /// </summary>
    Task<List<NeedResponse>> GetTrendingNeedsAsync(int maxResults = 20);
    
    /// <summary>
    /// Get category-based recommendations
    /// </summary>
    Task<List<NeedResponse>> GetCategoryBasedRecommendationsAsync(List<int> categoryIds, int maxResults = 20);
    
    /// <summary>
    /// Track user behavior for recommendations
    /// </summary>
    Task TrackUserBehaviorAsync(string userId, UserActionType actionType, string? targetId = null, string? targetType = null, object? metadata = null, string? ipAddress = null, string? userAgent = null);
    
    /// <summary>
    /// Get user interest profile
    /// </summary>
    Task<UserInterestProfile> GetUserInterestProfileAsync(string userId);
    
    /// <summary>
    /// Update user interest profile based on recent behavior
    /// </summary>
    Task UpdateUserInterestProfileAsync(string userId);
    
    /// <summary>
    /// Get similar users based on behavior patterns
    /// </summary>
    Task<List<string>> GetSimilarUsersAsync(string userId, int maxResults = 10);
    
    /// <summary>
    /// Get recommendations based on similar users
    /// </summary>
    Task<List<NeedResponse>> GetSimilarUserRecommendationsAsync(string userId, int maxResults = 20);
}