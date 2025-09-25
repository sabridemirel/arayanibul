using API.Data;
using API.Interfaces;
using API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IFileStorageService _fileStorageService;
    private readonly ILogger<UserService> _logger;

    public UserService(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        IFileStorageService fileStorageService,
        ILogger<UserService> logger)
    {
        _context = context;
        _userManager = userManager;
        _fileStorageService = fileStorageService;
        _logger = logger;
    }

    public async Task<ApplicationUser?> GetUserProfileAsync(string userId)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user profile for user {UserId}", userId);
            return null;
        }
    }

    public async Task<ApplicationUser?> UpdateUserProfileAsync(string userId, UpdateProfileRequest request)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return null;
            }

            // Update user properties if provided
            if (!string.IsNullOrWhiteSpace(request.FirstName))
                user.FirstName = request.FirstName;
            
            if (!string.IsNullOrWhiteSpace(request.LastName))
                user.LastName = request.LastName;
            
            if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
                user.PhoneNumber = request.PhoneNumber;
            
            if (!string.IsNullOrWhiteSpace(request.Address))
                user.Address = request.Address;
            
            if (request.Latitude.HasValue)
                user.Latitude = request.Latitude.Value;
            
            if (request.Longitude.HasValue)
                user.Longitude = request.Longitude.Value;
            
            if (request.UserType.HasValue)
                user.UserType = request.UserType.Value;

            user.UpdatedAt = DateTime.UtcNow;

            var result = await _userManager.UpdateAsync(user);
            if (result.Succeeded)
            {
                return user;
            }

            _logger.LogWarning("Failed to update user profile for user {UserId}: {Errors}", 
                userId, string.Join(", ", result.Errors.Select(e => e.Description)));
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user profile for user {UserId}", userId);
            return null;
        }
    }

    public async Task<string?> UploadProfileImageAsync(string userId, IFormFile imageFile)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return null;
            }

            // Delete old profile image if exists
            if (!string.IsNullOrEmpty(user.ProfileImageUrl))
            {
                await _fileStorageService.DeleteFileAsync(user.ProfileImageUrl);
            }

            // Upload new image
            var imageUrl = await _fileStorageService.UploadImageAsync(imageFile, "profiles");
            if (imageUrl == null)
            {
                return null;
            }

            // Update user profile image URL
            user.ProfileImageUrl = imageUrl;
            user.UpdatedAt = DateTime.UtcNow;

            var result = await _userManager.UpdateAsync(user);
            if (result.Succeeded)
            {
                return imageUrl;
            }

            // If user update failed, clean up the uploaded file
            await _fileStorageService.DeleteFileAsync(imageUrl);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading profile image for user {UserId}", userId);
            return null;
        }
    }

    public async Task<bool> DeleteProfileImageAsync(string userId)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.ProfileImageUrl))
            {
                return false;
            }

            // Delete the file
            var deleted = await _fileStorageService.DeleteFileAsync(user.ProfileImageUrl);
            if (!deleted)
            {
                return false;
            }

            // Update user profile
            user.ProfileImageUrl = null;
            user.UpdatedAt = DateTime.UtcNow;

            var result = await _userManager.UpdateAsync(user);
            return result.Succeeded;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting profile image for user {UserId}", userId);
            return false;
        }
    }
}