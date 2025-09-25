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
}