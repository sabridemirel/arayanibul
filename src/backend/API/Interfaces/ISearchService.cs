using API.Models;

namespace API.Interfaces;

public interface ISearchService
{
    /// <summary>
    /// Advanced search with full-text search and ranking
    /// </summary>
    Task<SearchResponse> AdvancedSearchAsync(AdvancedSearchRequest request, string? userId = null, string? ipAddress = null, string? userAgent = null);
    
    /// <summary>
    /// Get search suggestions based on query
    /// </summary>
    Task<List<SearchSuggestion>> GetSearchSuggestionsAsync(string query, int maxResults = 10);
    
    /// <summary>
    /// Get user's search history
    /// </summary>
    Task<List<SearchHistoryResponse>> GetUserSearchHistoryAsync(string userId, int maxResults = 50);
    
    /// <summary>
    /// Get popular searches
    /// </summary>
    Task<List<PopularSearchResponse>> GetPopularSearchesAsync(int maxResults = 20, int daysBack = 30);
    
    /// <summary>
    /// Clear user's search history
    /// </summary>
    Task<bool> ClearUserSearchHistoryAsync(string userId);
    
    /// <summary>
    /// Get search analytics for admin
    /// </summary>
    Task<Dictionary<string, object>> GetSearchAnalyticsAsync(DateTime? fromDate = null, DateTime? toDate = null);
}