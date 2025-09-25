using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using API.Interfaces;
using API.Models;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;
    private readonly IRecommendationService _recommendationService;
    private readonly ILogger<SearchController> _logger;

    public SearchController(ISearchService searchService, IRecommendationService recommendationService, ILogger<SearchController> logger)
    {
        _searchService = searchService;
        _recommendationService = recommendationService;
        _logger = logger;
    }

    /// <summary>
    /// Gelişmiş arama - Full-text search ve ranking ile
    /// </summary>
    [HttpPost("advanced")]
    public async Task<ActionResult<SearchResponse>> AdvancedSearch([FromBody] AdvancedSearchRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();

            var result = await _searchService.AdvancedSearchAsync(request, userId, ipAddress, userAgent);
            
            // Track search behavior for recommendations
            if (!string.IsNullOrEmpty(userId))
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _recommendationService.TrackUserBehaviorAsync(
                            userId, UserActionType.Search, null, "search", 
                            new { searchText = request.SearchText, resultCount = result.TotalCount }, 
                            ipAddress, userAgent);
                    }
                    catch
                    {
                        // Ignore tracking errors
                    }
                });
            }
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing advanced search for query: {SearchText}", request.SearchText);
            return StatusCode(500, "Arama sırasında bir hata oluştu.");
        }
    }

    /// <summary>
    /// Arama önerileri getir
    /// </summary>
    [HttpGet("suggestions")]
    public async Task<ActionResult<List<SearchSuggestion>>> GetSearchSuggestions(
        [FromQuery] string query,
        [FromQuery] int maxResults = 10)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
        {
            return Ok(new List<SearchSuggestion>());
        }

        try
        {
            var suggestions = await _searchService.GetSearchSuggestionsAsync(query, maxResults);
            return Ok(suggestions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search suggestions for query: {Query}", query);
            return StatusCode(500, "Öneriler alınırken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Kullanıcının arama geçmişini getir
    /// </summary>
    [HttpGet("history")]
    [Authorize]
    public async Task<ActionResult<List<SearchHistoryResponse>>> GetSearchHistory([FromQuery] int maxResults = 50)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var history = await _searchService.GetUserSearchHistoryAsync(userId, maxResults);
            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search history for user");
            return StatusCode(500, "Arama geçmişi alınırken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Kullanıcının arama geçmişini temizle
    /// </summary>
    [HttpDelete("history")]
    [Authorize]
    public async Task<ActionResult> ClearSearchHistory()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var result = await _searchService.ClearUserSearchHistoryAsync(userId);
            if (result)
            {
                return Ok(new { message = "Arama geçmişi başarıyla temizlendi." });
            }

            return StatusCode(500, "Arama geçmişi temizlenirken bir hata oluştu.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing search history for user");
            return StatusCode(500, "Arama geçmişi temizlenirken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Popüler aramaları getir
    /// </summary>
    [HttpGet("popular")]
    public async Task<ActionResult<List<PopularSearchResponse>>> GetPopularSearches(
        [FromQuery] int maxResults = 20,
        [FromQuery] int daysBack = 30)
    {
        try
        {
            var popularSearches = await _searchService.GetPopularSearchesAsync(maxResults, daysBack);
            return Ok(popularSearches);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular searches");
            return StatusCode(500, "Popüler aramalar alınırken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Arama analitikleri (Admin only)
    /// </summary>
    [HttpGet("analytics")]
    [Authorize] // TODO: Add admin role check
    public async Task<ActionResult<Dictionary<string, object>>> GetSearchAnalytics(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            // TODO: Add admin role validation
            // var userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value);
            // if (!userRoles.Contains("Admin"))
            // {
            //     return Forbid("Bu işlem için admin yetkisi gereklidir.");
            // }

            var analytics = await _searchService.GetSearchAnalyticsAsync(fromDate, toDate);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search analytics");
            return StatusCode(500, "Arama analitikleri alınırken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Hızlı arama - Basit text search
    /// </summary>
    [HttpGet("quick")]
    public async Task<ActionResult<SearchResponse>> QuickSearch(
        [FromQuery] string q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] double? lat = null,
        [FromQuery] double? lng = null,
        [FromQuery] double? radius = null)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return BadRequest("Arama terimi gereklidir.");
        }

        try
        {
            var request = new AdvancedSearchRequest
            {
                SearchText = q,
                Page = page,
                PageSize = pageSize,
                Latitude = lat,
                Longitude = lng,
                RadiusKm = radius,
                SortBy = SearchSortBy.Relevance
            };

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();

            var result = await _searchService.AdvancedSearchAsync(request, userId, ipAddress, userAgent);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing quick search for query: {Query}", q);
            return StatusCode(500, "Arama sırasında bir hata oluştu.");
        }
    }

    /// <summary>
    /// Kategori bazlı arama
    /// </summary>
    [HttpGet("by-category/{categoryId}")]
    public async Task<ActionResult<SearchResponse>> SearchByCategory(
        int categoryId,
        [FromQuery] string? q = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] double? lat = null,
        [FromQuery] double? lng = null,
        [FromQuery] double? radius = null)
    {
        try
        {
            var request = new AdvancedSearchRequest
            {
                SearchText = q ?? "",
                CategoryIds = new List<int> { categoryId },
                Page = page,
                PageSize = pageSize,
                Latitude = lat,
                Longitude = lng,
                RadiusKm = radius,
                SortBy = string.IsNullOrEmpty(q) ? SearchSortBy.CreatedAt : SearchSortBy.Relevance
            };

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();

            var result = await _searchService.AdvancedSearchAsync(request, userId, ipAddress, userAgent);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing category search for category: {CategoryId}", categoryId);
            return StatusCode(500, "Kategori araması sırasında bir hata oluştu.");
        }
    }

    /// <summary>
    /// Konum bazlı arama
    /// </summary>
    [HttpGet("nearby")]
    public async Task<ActionResult<SearchResponse>> SearchNearby(
        [FromQuery] double lat,
        [FromQuery] double lng,
        [FromQuery] double radius = 10,
        [FromQuery] string? q = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var request = new AdvancedSearchRequest
            {
                SearchText = q ?? "",
                Latitude = lat,
                Longitude = lng,
                RadiusKm = radius,
                Page = page,
                PageSize = pageSize,
                SortBy = SearchSortBy.Distance
            };

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();

            var result = await _searchService.AdvancedSearchAsync(request, userId, ipAddress, userAgent);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing nearby search");
            return StatusCode(500, "Yakındaki arama sırasında bir hata oluştu.");
        }
    }
}