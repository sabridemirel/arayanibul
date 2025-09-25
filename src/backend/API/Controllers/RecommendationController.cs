using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using API.Interfaces;
using API.Models;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecommendationController : ControllerBase
{
    private readonly IRecommendationService _recommendationService;
    private readonly ILogger<RecommendationController> _logger;

    public RecommendationController(IRecommendationService recommendationService, ILogger<RecommendationController> logger)
    {
        _recommendationService = recommendationService;
        _logger = logger;
    }

    /// <summary>
    /// Kişiselleştirilmiş öneriler getir
    /// </summary>
    [HttpPost("personalized")]
    public async Task<ActionResult<List<RecommendationResponse>>> GetPersonalizedRecommendations([FromBody] RecommendationRequest request)
    {
        try
        {
            // Get user ID from token if available
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                request.UserId = userId;
            }

            var recommendations = await _recommendationService.GetPersonalizedRecommendationsAsync(request);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting personalized recommendations");
            return StatusCode(500, "Öneriler alınırken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Popüler ihtiyaçları getir
    /// </summary>
    [HttpGet("popular")]
    public async Task<ActionResult<PopularNeedsResponse>> GetPopularNeeds(
        [FromQuery] int maxResults = 20,
        [FromQuery] int daysBack = 7)
    {
        try
        {
            var popularNeeds = await _recommendationService.GetPopularNeedsAsync(maxResults, daysBack);
            return Ok(popularNeeds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular needs");
            return StatusCode(500, "Popüler ihtiyaçlar alınırken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Konum bazlı öneriler getir
    /// </summary>
    [HttpGet("location-based")]
    public async Task<ActionResult<LocationBasedRecommendationResponse>> GetLocationBasedRecommendations(
        [FromQuery] double latitude,
        [FromQuery] double longitude,
        [FromQuery] double radiusKm = 25,
        [FromQuery] int maxResults = 20)
    {
        try
        {
            var recommendations = await _recommendationService.GetLocationBasedRecommendationsAsync(
                latitude, longitude, radiusKm, maxResults);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting location-based recommendations");
            return StatusCode(500, "Konum bazlı öneriler alınırken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Trend olan ihtiyaçları getir
    /// </summary>
    [HttpGet("trending")]
    public async Task<ActionResult<List<NeedResponse>>> GetTrendingNeeds([FromQuery] int maxResults = 20)
    {
        try
        {
            var trendingNeeds = await _recommendationService.GetTrendingNeedsAsync(maxResults);
            return Ok(trendingNeeds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trending needs");
            return StatusCode(500, "Trend ihtiyaçlar alınırken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Kategori bazlı öneriler getir
    /// </summary>
    [HttpGet("category-based")]
    public async Task<ActionResult<List<NeedResponse>>> GetCategoryBasedRecommendations(
        [FromQuery] List<int> categoryIds,
        [FromQuery] int maxResults = 20)
    {
        if (categoryIds == null || !categoryIds.Any())
        {
            return BadRequest("En az bir kategori ID'si gereklidir.");
        }

        try
        {
            var recommendations = await _recommendationService.GetCategoryBasedRecommendationsAsync(categoryIds, maxResults);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting category-based recommendations");
            return StatusCode(500, "Kategori bazlı öneriler alınırken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Benzer kullanıcı önerilerini getir
    /// </summary>
    [HttpGet("similar-users")]
    [Authorize]
    public async Task<ActionResult<List<NeedResponse>>> GetSimilarUserRecommendations([FromQuery] int maxResults = 20)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var recommendations = await _recommendationService.GetSimilarUserRecommendationsAsync(userId, maxResults);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting similar user recommendations");
            return StatusCode(500, "Benzer kullanıcı önerileri alınırken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Kullanıcı davranışını kaydet
    /// </summary>
    [HttpPost("track-behavior")]
    [Authorize]
    public async Task<ActionResult> TrackUserBehavior([FromBody] TrackBehaviorRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();

            await _recommendationService.TrackUserBehaviorAsync(
                userId, request.ActionType, request.TargetId, request.TargetType, 
                request.Metadata, ipAddress, userAgent);

            return Ok(new { message = "Davranış başarıyla kaydedildi." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking user behavior");
            return StatusCode(500, "Davranış kaydedilirken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Kullanıcı ilgi profilini getir
    /// </summary>
    [HttpGet("user-profile")]
    [Authorize]
    public async Task<ActionResult<UserInterestProfile>> GetUserInterestProfile()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var profile = await _recommendationService.GetUserInterestProfileAsync(userId);
            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user interest profile");
            return StatusCode(500, "Kullanıcı profili alınırken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Hızlı öneriler - Ana sayfa için
    /// </summary>
    [HttpGet("quick")]
    public async Task<ActionResult<List<NeedResponse>>> GetQuickRecommendations(
        [FromQuery] double? lat = null,
        [FromQuery] double? lng = null,
        [FromQuery] int maxResults = 10)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            var request = new RecommendationRequest
            {
                UserId = userId,
                Latitude = lat,
                Longitude = lng,
                MaxResults = maxResults,
                Type = RecommendationType.Mixed
            };

            var recommendations = await _recommendationService.GetPersonalizedRecommendationsAsync(request);
            var quickResults = recommendations.SelectMany(r => r.Recommendations).Take(maxResults).ToList();
            
            return Ok(quickResults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting quick recommendations");
            return StatusCode(500, "Hızlı öneriler alınırken bir hata oluştu.");
        }
    }

    /// <summary>
    /// Keşfet sayfası için çeşitli öneriler
    /// </summary>
    [HttpGet("discover")]
    public async Task<ActionResult<DiscoverResponse>> GetDiscoverRecommendations(
        [FromQuery] double? lat = null,
        [FromQuery] double? lng = null)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            // Get different types of recommendations
            var popularTask = _recommendationService.GetPopularNeedsAsync(8, 7);
            var trendingTask = _recommendationService.GetTrendingNeedsAsync(8);
            
            Task<LocationBasedRecommendationResponse>? locationTask = null;
            if (lat.HasValue && lng.HasValue)
            {
                locationTask = _recommendationService.GetLocationBasedRecommendationsAsync(lat.Value, lng.Value, 25, 8);
            }

            Task<List<NeedResponse>>? similarUserTask = null;
            if (!string.IsNullOrEmpty(userId))
            {
                similarUserTask = _recommendationService.GetSimilarUserRecommendationsAsync(userId, 8);
            }

            await Task.WhenAll(new Task[] { popularTask, trendingTask }
                .Concat(locationTask != null ? new[] { locationTask } : Array.Empty<Task>())
                .Concat(similarUserTask != null ? new[] { similarUserTask } : Array.Empty<Task>()));

            var response = new DiscoverResponse
            {
                Popular = popularTask.Result,
                Trending = trendingTask.Result,
                Nearby = locationTask?.Result,
                ForYou = similarUserTask?.Result ?? new List<NeedResponse>()
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting discover recommendations");
            return StatusCode(500, "Keşfet önerileri alınırken bir hata oluştu.");
        }
    }
}

public class TrackBehaviorRequest
{
    public UserActionType ActionType { get; set; }
    public string? TargetId { get; set; }
    public string? TargetType { get; set; }
    public object? Metadata { get; set; }
}

public class DiscoverResponse
{
    public PopularNeedsResponse Popular { get; set; } = new();
    public List<NeedResponse> Trending { get; set; } = new();
    public LocationBasedRecommendationResponse? Nearby { get; set; }
    public List<NeedResponse> ForYou { get; set; } = new();
}