using API.Interfaces;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<UserController> _logger;

    public UserController(IUserService userService, ILogger<UserController> logger)
    {
        _userService = userService;
        _logger = logger;
    }

    [HttpGet("profile")]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı" });
        }

        var user = await _userService.GetUserProfileAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "Kullanıcı bulunamadı" });
        }

        var userProfile = new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FirstName = user.FirstName,
            LastName = user.LastName,
            PhoneNumber = user.PhoneNumber,
            ProfileImageUrl = user.ProfileImageUrl,
            Address = user.Address,
            Latitude = user.Latitude,
            Longitude = user.Longitude,
            UserType = user.UserType,
            Rating = user.Rating,
            ReviewCount = user.ReviewCount,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            IsGuest = user.IsGuest
        };

        return Ok(userProfile);
    }

    [HttpGet("profile/{userId}")]
    public async Task<ActionResult<UserProfileDto>> GetUserProfile(string userId)
    {
        var user = await _userService.GetUserProfileAsync(userId);
        if (user == null)
        {
            return NotFound(new { message = "Kullanıcı bulunamadı" });
        }

        // Return limited profile information for other users
        var userProfile = new UserProfileDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            ProfileImageUrl = user.ProfileImageUrl,
            UserType = user.UserType,
            Rating = user.Rating,
            ReviewCount = user.ReviewCount,
            CreatedAt = user.CreatedAt,
            IsGuest = user.IsGuest
        };

        return Ok(userProfile);
    }

    [HttpPut("profile")]
    public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı" });
        }

        var updatedUser = await _userService.UpdateUserProfileAsync(userId, request);
        if (updatedUser == null)
        {
            return BadRequest(new { message = "Profil güncellenemedi" });
        }

        var userProfile = new UserProfileDto
        {
            Id = updatedUser.Id,
            Email = updatedUser.Email ?? string.Empty,
            FirstName = updatedUser.FirstName,
            LastName = updatedUser.LastName,
            PhoneNumber = updatedUser.PhoneNumber,
            ProfileImageUrl = updatedUser.ProfileImageUrl,
            Address = updatedUser.Address,
            Latitude = updatedUser.Latitude,
            Longitude = updatedUser.Longitude,
            UserType = updatedUser.UserType,
            Rating = updatedUser.Rating,
            ReviewCount = updatedUser.ReviewCount,
            CreatedAt = updatedUser.CreatedAt,
            UpdatedAt = updatedUser.UpdatedAt,
            IsGuest = updatedUser.IsGuest
        };

        return Ok(userProfile);
    }

    [HttpPost("profile/image")]
    [ApiExplorerSettings(IgnoreApi = true)]  // Swagger'dan exclude et
    public async Task<ActionResult<UploadImageResponse>> UploadProfileImage([FromForm] IFormFile image)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı" });
        }

        if (image == null || image.Length == 0)
        {
            return BadRequest(new UploadImageResponse 
            { 
                Success = false, 
                Message = "Geçerli bir resim dosyası seçin" 
            });
        }

        // Validate file type
        var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(image.ContentType.ToLower()))
        {
            return BadRequest(new UploadImageResponse 
            { 
                Success = false, 
                Message = "Sadece JPEG, PNG ve WebP formatları desteklenir" 
            });
        }

        // Validate file size (5MB max)
        if (image.Length > 5 * 1024 * 1024)
        {
            return BadRequest(new UploadImageResponse 
            { 
                Success = false, 
                Message = "Dosya boyutu 5MB'dan küçük olmalıdır" 
            });
        }

        var imageUrl = await _userService.UploadProfileImageAsync(userId, image);
        if (imageUrl == null)
        {
            return BadRequest(new UploadImageResponse 
            { 
                Success = false, 
                Message = "Resim yüklenemedi" 
            });
        }

        return Ok(new UploadImageResponse 
        { 
            Success = true, 
            Message = "Profil resmi başarıyla yüklendi", 
            ImageUrl = imageUrl 
        });
    }

    [HttpDelete("profile/image")]
    public async Task<ActionResult> DeleteProfileImage()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı" });
        }

        var deleted = await _userService.DeleteProfileImageAsync(userId);
        if (!deleted)
        {
            return BadRequest(new { message = "Profil resmi silinemedi" });
        }

        return Ok(new { message = "Profil resmi başarıyla silindi" });
    }

    /// <summary>
    /// Gets authenticated user's full statistics including financial data
    /// </summary>
    /// <returns>User statistics with needs count, offers count, transactions, spending/earnings</returns>
    /// <response code="200">Returns user statistics</response>
    /// <response code="401">Unauthorized - user not authenticated</response>
    /// <response code="404">User not found</response>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(UserStatisticsResponse), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<UserStatisticsResponse>> GetUserStatistics()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı" });
        }

        var stats = await _userService.GetUserStatisticsAsync(userId);
        if (stats == null)
        {
            return NotFound(new { message = "Kullanıcı bulunamadı" });
        }

        return Ok(stats);
    }

    /// <summary>
    /// Gets public statistics for any user (no authentication required)
    /// </summary>
    /// <param name="userId">The user ID to get statistics for</param>
    /// <returns>Public user statistics (completed transactions, rating, badges)</returns>
    /// <response code="200">Returns public user statistics</response>
    /// <response code="404">User not found</response>
    [HttpGet("stats/{userId}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PublicUserStatisticsResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<PublicUserStatisticsResponse>> GetPublicUserStatistics(string userId)
    {
        var stats = await _userService.GetPublicUserStatisticsAsync(userId);
        if (stats == null)
        {
            return NotFound(new { message = "Kullanıcı bulunamadı" });
        }

        return Ok(stats);
    }
}