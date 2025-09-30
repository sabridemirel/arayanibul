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
    private readonly ICacheService _cacheService;
    private readonly ILogger<UserService> _logger;

    public UserService(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        IFileStorageService fileStorageService,
        ICacheService cacheService,
        ILogger<UserService> logger)
    {
        _context = context;
        _userManager = userManager;
        _fileStorageService = fileStorageService;
        _cacheService = cacheService;
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

    /// <summary>
    /// Gets full statistics for the authenticated user including private financial data
    /// Results are cached for 5 minutes
    /// </summary>
    public async Task<UserStatisticsResponse?> GetUserStatisticsAsync(string userId)
    {
        try
        {
            // Check cache first
            var cacheKey = $"user_stats_{userId}";
            var cachedStats = await _cacheService.GetAsync<UserStatisticsResponse>(cacheKey);
            if (cachedStats != null)
            {
                _logger.LogDebug("User statistics cache hit for user {UserId}", userId);
                return cachedStats;
            }

            // Get user
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("User not found for statistics: {UserId}", userId);
                return null;
            }

            // Calculate statistics using efficient LINQ queries
            var stats = new UserStatisticsResponse
            {
                // Count needs created by user
                NeedsCount = await _context.Needs
                    .AsNoTracking()
                    .Where(n => n.UserId == userId)
                    .CountAsync(),

                // Count offers given by user (as provider)
                OffersGivenCount = await _context.Offers
                    .AsNoTracking()
                    .Where(o => o.ProviderId == userId)
                    .CountAsync(),

                // Count offers received on user's needs (as buyer)
                OffersReceivedCount = await _context.Offers
                    .AsNoTracking()
                    .Where(o => o.Need.UserId == userId)
                    .CountAsync(),

                // Count completed transactions (Released status means completed)
                CompletedTransactionsCount = await _context.Transactions
                    .AsNoTracking()
                    .Where(t => (t.BuyerId == userId || t.ProviderId == userId) &&
                                t.Status == TransactionStatus.Released)
                    .CountAsync(),

                // Total spent - sum of Released transactions where user is buyer
                TotalSpent = await _context.Transactions
                    .AsNoTracking()
                    .Where(t => t.BuyerId == userId && t.Status == TransactionStatus.Released)
                    .SumAsync(t => (decimal?)t.Amount) ?? 0m,

                // Total earned - sum of Released transactions where user is provider
                TotalEarned = await _context.Transactions
                    .AsNoTracking()
                    .Where(t => t.ProviderId == userId && t.Status == TransactionStatus.Released)
                    .SumAsync(t => (decimal?)t.Amount) ?? 0m,

                // Average rating - only count visible reviews
                AverageRating = await _context.Reviews
                    .AsNoTracking()
                    .Where(r => r.RevieweeId == userId && r.IsVisible)
                    .AverageAsync(r => (double?)r.Rating) ?? 0.0,

                // Review count
                ReviewCount = await _context.Reviews
                    .AsNoTracking()
                    .Where(r => r.RevieweeId == userId && r.IsVisible)
                    .CountAsync(),

                // Verification badges
                VerificationBadges = user.VerificationBadges,

                // Member since
                MemberSince = user.CreatedAt
            };

            // Cache the results for 5 minutes
            await _cacheService.SetAsync(cacheKey, stats, TimeSpan.FromMinutes(5));

            _logger.LogInformation("User statistics calculated for user {UserId}: {Stats}",
                userId, System.Text.Json.JsonSerializer.Serialize(stats));

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user statistics for user {UserId}", userId);
            return null;
        }
    }

    /// <summary>
    /// Gets public statistics for any user (no authentication required)
    /// Results are cached for 5 minutes
    /// </summary>
    public async Task<PublicUserStatisticsResponse?> GetPublicUserStatisticsAsync(string userId)
    {
        try
        {
            // Check cache first
            var cacheKey = $"user_public_stats_{userId}";
            var cachedStats = await _cacheService.GetAsync<PublicUserStatisticsResponse>(cacheKey);
            if (cachedStats != null)
            {
                _logger.LogDebug("Public user statistics cache hit for user {UserId}", userId);
                return cachedStats;
            }

            // Get user
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("User not found for public statistics: {UserId}", userId);
                return null;
            }

            // Calculate public statistics using efficient LINQ queries
            var stats = new PublicUserStatisticsResponse
            {
                // Count completed transactions (Released status means completed)
                CompletedTransactionsCount = await _context.Transactions
                    .AsNoTracking()
                    .Where(t => (t.BuyerId == userId || t.ProviderId == userId) &&
                                t.Status == TransactionStatus.Released)
                    .CountAsync(),

                // Average rating - only count visible reviews
                AverageRating = await _context.Reviews
                    .AsNoTracking()
                    .Where(r => r.RevieweeId == userId && r.IsVisible)
                    .AverageAsync(r => (double?)r.Rating) ?? 0.0,

                // Review count
                ReviewCount = await _context.Reviews
                    .AsNoTracking()
                    .Where(r => r.RevieweeId == userId && r.IsVisible)
                    .CountAsync(),

                // Verification badges
                VerificationBadges = user.VerificationBadges,

                // Member since
                MemberSince = user.CreatedAt,

                // User type
                UserType = user.UserType
            };

            // Cache the results for 5 minutes
            await _cacheService.SetAsync(cacheKey, stats, TimeSpan.FromMinutes(5));

            _logger.LogInformation("Public user statistics calculated for user {UserId}", userId);

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting public user statistics for user {UserId}", userId);
            return null;
        }
    }
}