using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using API.Interfaces;
using API.Models;
using API.Middleware;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NeedController : ControllerBase
{
    private readonly INeedService _needService;
    private readonly IFileStorageService _fileStorageService;
    private readonly IRecommendationService _recommendationService;

    public NeedController(INeedService needService, IFileStorageService fileStorageService, IRecommendationService recommendationService)
    {
        _needService = needService;
        _fileStorageService = fileStorageService;
        _recommendationService = recommendationService;
    }

    /// <summary>
    /// İhtiyaç oluştur
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<NeedResponse>> CreateNeed([FromBody] CreateNeedRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var need = await _needService.CreateNeedAsync(request, userId);
            
            // Track user behavior for recommendations
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();
            
            _ = Task.Run(async () =>
            {
                try
                {
                    await _recommendationService.TrackUserBehaviorAsync(
                        userId, UserActionType.CreateNeed, need.Id.ToString(), "need", 
                        new { categoryId = need.CategoryId }, ipAddress, userAgent);
                }
                catch
                {
                    // Ignore tracking errors
                }
            });
            
            return CreatedAtAction(nameof(GetNeedById), new { id = need.Id }, need);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message, errors = ex.Errors });
        }
    }

    /// <summary>
    /// İhtiyaçları listele (filtreleme ve arama ile)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<NeedResponse>>> GetNeeds([FromQuery] NeedFilterRequest filter)
    {
        var result = await _needService.GetNeedsAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// İhtiyaç detayını getir
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<NeedResponse>> GetNeedById(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var need = await _needService.GetNeedByIdAsync(id, userId);
        
        if (need == null)
        {
            return NotFound("İhtiyaç bulunamadı.");
        }

        // Track user behavior for recommendations
        if (!string.IsNullOrEmpty(userId))
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();
            
            _ = Task.Run(async () =>
            {
                try
                {
                    await _recommendationService.TrackUserBehaviorAsync(
                        userId, UserActionType.ViewNeed, id.ToString(), "need", 
                        new { categoryId = need.CategoryId }, ipAddress, userAgent);
                }
                catch
                {
                    // Ignore tracking errors
                }
            });
        }

        return Ok(need);
    }

    /// <summary>
    /// İhtiyaç güncelle
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult<NeedResponse>> UpdateNeed(int id, [FromBody] UpdateNeedRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var need = await _needService.UpdateNeedAsync(id, request, userId);
            if (need == null)
            {
                return NotFound("İhtiyaç bulunamadı veya güncelleme yetkiniz yok.");
            }

            return Ok(need);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message, errors = ex.Errors });
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    /// <summary>
    /// İhtiyaç sil
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<ActionResult> DeleteNeed(int id)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var result = await _needService.DeleteNeedAsync(id, userId);
            if (!result)
            {
                return NotFound("İhtiyaç bulunamadı veya silme yetkiniz yok.");
            }

            return NoContent();
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message, errors = ex.Errors });
        }
    }

    /// <summary>
    /// Kullanıcının ihtiyaçlarını getir
    /// </summary>
    [HttpGet("my-needs")]
    [Authorize]
    public async Task<ActionResult<PagedResult<NeedResponse>>> GetMyNeeds(
        [FromQuery] NeedStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("Kullanıcı kimliği bulunamadı.");
        }

        var result = await _needService.GetUserNeedsAsync(userId, status, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// Belirli bir kullanıcının ihtiyaçlarını getir
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<PagedResult<NeedResponse>>> GetUserNeeds(
        string userId,
        [FromQuery] NeedStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _needService.GetUserNeedsAsync(userId, status, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// İhtiyaç arama
    /// </summary>
    [HttpGet("search")]
    public async Task<ActionResult<List<NeedResponse>>> SearchNeeds(
        [FromQuery] string searchText,
        [FromQuery] double? latitude = null,
        [FromQuery] double? longitude = null,
        [FromQuery] double? radiusKm = null,
        [FromQuery] int maxResults = 50)
    {
        if (string.IsNullOrWhiteSpace(searchText))
        {
            return BadRequest("Arama metni gereklidir.");
        }

        var result = await _needService.SearchNeedsAsync(searchText, latitude, longitude, radiusKm, maxResults);
        return Ok(result);
    }

    /// <summary>
    /// Yakındaki ihtiyaçları getir
    /// </summary>
    [HttpGet("nearby")]
    public async Task<ActionResult<List<NeedResponse>>> GetNearbyNeeds(
        [FromQuery] double latitude,
        [FromQuery] double longitude,
        [FromQuery] double radiusKm = 10,
        [FromQuery] int maxResults = 50)
    {
        var result = await _needService.GetNearbyNeedsAsync(latitude, longitude, radiusKm, maxResults);
        return Ok(result);
    }

    /// <summary>
    /// İhtiyaç için resim yükle
    /// </summary>
    [HttpPost("{id}/images")]
    [Authorize]
    public async Task<ActionResult<List<string>>> UploadNeedImages(int id, [FromForm] List<IFormFile> images)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            // Verify need ownership
            var need = await _needService.GetNeedByIdAsync(id, userId);
            if (need == null || need.UserId != userId)
            {
                return NotFound("İhtiyaç bulunamadı veya yetkiniz yok.");
            }

            if (images == null || !images.Any())
            {
                return BadRequest("En az bir resim yüklenmeli.");
            }

            if (images.Count > 5)
            {
                return BadRequest("En fazla 5 resim yüklenebilir.");
            }

            var imageUrls = new List<string>();
            foreach (var image in images)
            {
                if (image.Length > 5 * 1024 * 1024) // 5MB limit
                {
                    return BadRequest($"Resim boyutu 5MB'dan büyük olamaz: {image.FileName}");
                }

                var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
                if (!allowedTypes.Contains(image.ContentType.ToLower()))
                {
                    return BadRequest($"Desteklenmeyen resim formatı: {image.FileName}");
                }

                var imageUrl = await _fileStorageService.UploadImageAsync(image, "needs");
                if (!string.IsNullOrEmpty(imageUrl))
                {
                    imageUrls.Add(imageUrl);
                }
                else
                {
                    return StatusCode(500, $"Resim yükleme başarısız: {image.FileName}");
                }
            }

            // Update need with new images
            var updateRequest = new UpdateNeedRequest
            {
                ImageUrls = imageUrls
            };

            await _needService.UpdateNeedAsync(id, updateRequest, userId);

            return Ok(imageUrls);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Resim yükleme hatası: {ex.Message}");
        }
    }

    /// <summary>
    /// İhtiyaç resmini sil
    /// </summary>
    [HttpDelete("{id}/images/{imageId}")]
    [Authorize]
    public async Task<ActionResult> DeleteNeedImage(int id, int imageId)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            // Verify need ownership
            var need = await _needService.GetNeedByIdAsync(id, userId);
            if (need == null || need.UserId != userId)
            {
                return NotFound("İhtiyaç bulunamadı veya yetkiniz yok.");
            }

            var imageToDelete = need.Images.FirstOrDefault(i => i.Id == imageId);
            if (imageToDelete == null)
            {
                return NotFound("Resim bulunamadı.");
            }

            // Remove image from file storage
            await _fileStorageService.DeleteFileAsync(imageToDelete.ImageUrl);

            // Update need without this image
            var remainingImages = need.Images.Where(i => i.Id != imageId).Select(i => i.ImageUrl).ToList();
            var updateRequest = new UpdateNeedRequest
            {
                ImageUrls = remainingImages
            };

            await _needService.UpdateNeedAsync(id, updateRequest, userId);

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Resim silme hatası: {ex.Message}");
        }
    }

    /// <summary>
    /// İhtiyacı süresi dolmuş olarak işaretle
    /// </summary>
    [HttpPost("{id}/expire")]
    [Authorize]
    public async Task<ActionResult> ExpireNeed(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("Kullanıcı kimliği bulunamadı.");
        }

        // Verify need ownership
        var need = await _needService.GetNeedByIdAsync(id, userId);
        if (need == null || need.UserId != userId)
        {
            return NotFound("İhtiyaç bulunamadı veya yetkiniz yok.");
        }

        var result = await _needService.ExpireNeedAsync(id);
        if (!result)
        {
            return NotFound("İhtiyaç bulunamadı.");
        }

        return Ok(new { message = "İhtiyaç süresi dolmuş olarak işaretlendi." });
    }

    /// <summary>
    /// Gelişmiş filtreleme ile ihtiyaç arama
    /// </summary>
    [HttpPost("advanced-search")]
    public async Task<ActionResult<PagedResult<NeedResponse>>> AdvancedSearch([FromBody] NeedFilterRequest filter)
    {
        var result = await _needService.GetNeedsAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Trend olan ihtiyaçları getir
    /// </summary>
    [HttpGet("trending")]
    public async Task<ActionResult<List<NeedResponse>>> GetTrendingNeeds([FromQuery] int maxResults = 20)
    {
        var result = await _needService.GetTrendingNeedsAsync(maxResults);
        return Ok(result);
    }

    /// <summary>
    /// Kategorilere göre ihtiyaçları getir (alt kategoriler dahil)
    /// </summary>
    [HttpGet("by-categories")]
    public async Task<ActionResult<PagedResult<NeedResponse>>> GetNeedsByCategories(
        [FromQuery] List<int> categoryIds,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (categoryIds == null || !categoryIds.Any())
        {
            return BadRequest("En az bir kategori ID'si gereklidir.");
        }

        var result = await _needService.GetNeedsByCategoriesAsync(categoryIds, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// Acil ihtiyaçları getir
    /// </summary>
    [HttpGet("urgent")]
    public async Task<ActionResult<List<NeedResponse>>> GetUrgentNeeds(
        [FromQuery] double? latitude = null,
        [FromQuery] double? longitude = null,
        [FromQuery] double? radiusKm = null,
        [FromQuery] int maxResults = 50)
    {
        var result = await _needService.GetUrgentNeedsAsync(latitude, longitude, radiusKm, maxResults);
        return Ok(result);
    }

    /// <summary>
    /// Süresi yakında dolacak ihtiyaçları getir
    /// </summary>
    [HttpGet("expiring-soon")]
    public async Task<ActionResult<List<NeedResponse>>> GetExpiringSoonNeeds([FromQuery] int maxResults = 50)
    {
        var result = await _needService.GetExpiringSoonNeedsAsync(maxResults);
        return Ok(result);
    }

    /// <summary>
    /// Gelişmiş metin arama (relevans skorlaması ile)
    /// </summary>
    [HttpGet("advanced-text-search")]
    public async Task<ActionResult<List<NeedResponse>>> AdvancedTextSearch(
        [FromQuery] string searchText,
        [FromQuery] int maxResults = 50)
    {
        if (string.IsNullOrWhiteSpace(searchText))
        {
            return BadRequest("Arama metni gereklidir.");
        }

        var result = await _needService.AdvancedTextSearchAsync(searchText, maxResults);
        return Ok(result);
    }

    /// <summary>
    /// Bütçe aralığına göre ihtiyaçları getir
    /// </summary>
    [HttpGet("by-budget")]
    public async Task<ActionResult<List<NeedResponse>>> GetNeedsByBudgetRange(
        [FromQuery] decimal minBudget,
        [FromQuery] decimal maxBudget,
        [FromQuery] string currency = "TRY",
        [FromQuery] int maxResults = 50)
    {
        if (minBudget < 0 || maxBudget < 0 || minBudget > maxBudget)
        {
            return BadRequest("Geçersiz bütçe aralığı.");
        }

        var result = await _needService.GetNeedsByBudgetRangeAsync(minBudget, maxBudget, currency, maxResults);
        return Ok(result);
    }
}