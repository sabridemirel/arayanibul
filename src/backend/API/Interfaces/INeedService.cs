using API.Models;

namespace API.Interfaces;

public interface INeedService
{
    Task<NeedResponse> CreateNeedAsync(CreateNeedRequest request, string userId);
    Task<PagedResult<NeedResponse>> GetNeedsAsync(NeedFilterRequest filter);
    Task<NeedResponse?> GetNeedByIdAsync(int needId, string? userId = null);
    Task<NeedResponse?> UpdateNeedAsync(int needId, UpdateNeedRequest request, string userId);
    Task<bool> DeleteNeedAsync(int needId, string userId);
    /// <summary>Whether a listing's words fit the chosen category; suggests a better one when not.</summary>
    Task<CategoryCheckResponse> CheckCategoryAsync(CategoryCheckRequest request);
    /// <summary>"Fiyat artarsa haber ver" on a fixed-price listing: start or stop waiting for a price change.</summary>
    Task<PriceWatchResponse> SetPriceWatchAsync(int needId, string userId, bool watch);
    Task<PagedResult<NeedResponse>> GetUserNeedsAsync(string userId, NeedStatus? status = null, int page = 1, int pageSize = 20, bool ownerView = false);
    Task<List<NeedResponse>> SearchNeedsAsync(string searchText, double? latitude = null, double? longitude = null, double? radiusKm = null, int maxResults = 50);
    Task<bool> ExpireNeedAsync(int needId);
    Task<int> ExpireUrgentShowcasesAsync();
    Task<List<NeedResponse>> GetNearbyNeedsAsync(double latitude, double longitude, double radiusKm = 10, int maxResults = 50);
    Task<List<NeedResponse>> GetTrendingNeedsAsync(int maxResults = 20);
    Task<PagedResult<NeedResponse>> GetNeedsByCategoriesAsync(List<int> categoryIds, int page = 1, int pageSize = 20);
    Task<List<NeedResponse>> GetUrgentNeedsAsync(double? latitude = null, double? longitude = null, double? radiusKm = null, int maxResults = 50);
    Task<List<NeedResponse>> GetExpiringSoonNeedsAsync(int maxResults = 50);
    Task<List<NeedResponse>> AdvancedTextSearchAsync(string searchText, int maxResults = 50);
    Task<List<NeedResponse>> GetNeedsByBudgetRangeAsync(decimal minBudget, decimal maxBudget, string currency = "TRY", int maxResults = 50);
}