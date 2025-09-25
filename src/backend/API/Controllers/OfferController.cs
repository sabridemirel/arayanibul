using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using API.Interfaces;
using API.Models;
using API.Middleware;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OfferController : ControllerBase
{
    private readonly IOfferService _offerService;
    private readonly IFileStorageService _fileStorageService;

    public OfferController(IOfferService offerService, IFileStorageService fileStorageService)
    {
        _offerService = offerService;
        _fileStorageService = fileStorageService;
    }

    /// <summary>
    /// Teklif oluştur
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<OfferResponse>> CreateOffer([FromBody] CreateOfferRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var offer = await _offerService.CreateOfferAsync(request, userId);
            return CreatedAtAction(nameof(GetOfferById), new { id = offer.Id }, offer);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message, errors = ex.Errors });
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    /// <summary>
    /// Teklif detayını getir
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<OfferResponse>> GetOfferById(int id)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var offer = await _offerService.GetOfferByIdAsync(id, userId);
            
            if (offer == null)
            {
                return NotFound("Teklif bulunamadı.");
            }

            return Ok(offer);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    /// <summary>
    /// Teklif güncelle
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult<OfferResponse>> UpdateOffer(int id, [FromBody] UpdateOfferRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var offer = await _offerService.UpdateOfferAsync(id, request, userId);
            if (offer == null)
            {
                return NotFound("Teklif bulunamadı veya güncelleme yetkiniz yok.");
            }

            return Ok(offer);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message, errors = ex.Errors });
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    /// <summary>
    /// Teklif sil
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<ActionResult> DeleteOffer(int id)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var result = await _offerService.DeleteOfferAsync(id, userId);
            if (!result)
            {
                return NotFound("Teklif bulunamadı veya silme yetkiniz yok.");
            }

            return NoContent();
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message, errors = ex.Errors });
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    /// <summary>
    /// Belirli bir ihtiyaç için teklifleri getir
    /// </summary>
    [HttpGet("need/{needId}")]
    public async Task<ActionResult<PagedResult<OfferResponse>>> GetOffersForNeed(int needId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _offerService.GetOffersForNeedAsync(needId, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// Sağlayıcının tekliflerini getir
    /// </summary>
    [HttpGet("provider")]
    [Authorize]
    public async Task<ActionResult<PagedResult<OfferResponse>>> GetProviderOffers([FromQuery] OfferStatus? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("Kullanıcı kimliği bulunamadı.");
        }

        var result = await _offerService.GetProviderOffersAsync(userId, status, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// Alıcının aldığı teklifleri getir
    /// </summary>
    [HttpGet("buyer")]
    [Authorize]
    public async Task<ActionResult<PagedResult<OfferResponse>>> GetBuyerOffers([FromQuery] OfferStatus? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("Kullanıcı kimliği bulunamadı.");
        }

        var result = await _offerService.GetBuyerOffersAsync(userId, status, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// Teklifleri filtrele ve listele
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<OfferResponse>>> GetOffers([FromQuery] OfferFilterRequest filter)
    {
        var result = await _offerService.GetOffersAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Teklifi kabul et
    /// </summary>
    [HttpPost("{id}/accept")]
    [Authorize]
    public async Task<ActionResult> AcceptOffer(int id)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var result = await _offerService.AcceptOfferAsync(id, userId);
            if (!result)
            {
                return BadRequest("Teklif kabul edilemedi.");
            }

            return Ok(new { message = "Teklif başarıyla kabul edildi." });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message, errors = ex.Errors });
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    /// <summary>
    /// Teklifi reddet
    /// </summary>
    [HttpPost("{id}/reject")]
    [Authorize]
    public async Task<ActionResult> RejectOffer(int id, [FromBody] RejectOfferRequest? request = null)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var result = await _offerService.RejectOfferAsync(id, userId, request?.Reason);
            if (!result)
            {
                return BadRequest("Teklif reddedilemedi.");
            }

            return Ok(new { message = "Teklif başarıyla reddedildi." });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message, errors = ex.Errors });
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    /// <summary>
    /// Teklifi geri çek
    /// </summary>
    [HttpPost("{id}/withdraw")]
    [Authorize]
    public async Task<ActionResult> WithdrawOffer(int id)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var result = await _offerService.WithdrawOfferAsync(id, userId);
            if (!result)
            {
                return BadRequest("Teklif geri çekilemedi.");
            }

            return Ok(new { message = "Teklif başarıyla geri çekildi." });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message, errors = ex.Errors });
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    /// <summary>
    /// İhtiyaç için teklif istatistiklerini getir
    /// </summary>
    [HttpGet("stats/need/{needId}")]
    public async Task<ActionResult<OfferStatsResponse>> GetOfferStatsForNeed(int needId)
    {
        var stats = await _offerService.GetOfferStatsForNeedAsync(needId);
        return Ok(stats);
    }

    /// <summary>
    /// Sağlayıcının teklif istatistiklerini getir
    /// </summary>
    [HttpGet("stats/provider")]
    [Authorize]
    public async Task<ActionResult<OfferStatsResponse>> GetProviderOfferStats()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("Kullanıcı kimliği bulunamadı.");
        }

        var stats = await _offerService.GetProviderOfferStatsAsync(userId);
        return Ok(stats);
    }

    /// <summary>
    /// İhtiyaç için en iyi teklifleri getir
    /// </summary>
    [HttpGet("top/need/{needId}")]
    public async Task<ActionResult<List<OfferResponse>>> GetTopOffersForNeed(int needId, [FromQuery] int maxResults = 5)
    {
        var offers = await _offerService.GetTopOffersForNeedAsync(needId, maxResults);
        return Ok(offers);
    }

    /// <summary>
    /// Teklif için resim yükle
    /// </summary>
    [HttpPost("{id}/images")]
    [Authorize]
    public async Task<ActionResult<List<string>>> UploadOfferImages(int id, [FromForm] List<IFormFile> images)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            // Check if user can manage this offer
            if (!await _offerService.CanProviderManageOfferAsync(id, userId))
            {
                return Unauthorized("Bu teklife resim yükleme yetkiniz yok.");
            }

            if (images == null || !images.Any())
            {
                return BadRequest("En az bir resim seçmelisiniz.");
            }

            if (images.Count > 3)
            {
                return BadRequest("En fazla 3 resim yükleyebilirsiniz.");
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

                var imageUrl = await _fileStorageService.UploadImageAsync(image, "offers");
                if (imageUrl != null)
                {
                    imageUrls.Add(imageUrl);
                }
                else
                {
                    return StatusCode(500, new { message = $"Resim yüklenemedi: {image.FileName}" });
                }
            }

            return Ok(imageUrls);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Resim yükleme sırasında hata oluştu.", error = ex.Message });
        }
    }

    /// <summary>
    /// Kullanıcının teklif erişim yetkisini kontrol et
    /// </summary>
    [HttpGet("{id}/access")]
    [Authorize]
    public async Task<ActionResult<bool>> CanUserAccessOffer(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("Kullanıcı kimliği bulunamadı.");
        }

        var canAccess = await _offerService.CanUserAccessOfferAsync(id, userId);
        return Ok(canAccess);
    }

    /// <summary>
    /// Sağlayıcının ihtiyaca teklif verme yetkisini kontrol et
    /// </summary>
    [HttpGet("can-create/{needId}")]
    [Authorize]
    public async Task<ActionResult<bool>> CanProviderCreateOffer(int needId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized("Kullanıcı kimliği bulunamadı.");
        }

        var canCreate = await _offerService.CanProviderCreateOfferAsync(needId, userId);
        return Ok(canCreate);
    }
}