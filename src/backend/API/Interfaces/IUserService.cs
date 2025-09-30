using API.Models;

namespace API.Interfaces;

public interface IUserService
{
    Task<ApplicationUser?> GetUserProfileAsync(string userId);
    Task<ApplicationUser?> UpdateUserProfileAsync(string userId, UpdateProfileRequest request);
    Task<string?> UploadProfileImageAsync(string userId, IFormFile imageFile);
    Task<bool> DeleteProfileImageAsync(string userId);

    /// <summary>
    /// Gets full statistics for the authenticated user including private financial data
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <returns>User statistics or null if user not found</returns>
    Task<UserStatisticsResponse?> GetUserStatisticsAsync(string userId);

    /// <summary>
    /// Gets public statistics for any user (no authentication required)
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <returns>Public user statistics or null if user not found</returns>
    Task<PublicUserStatisticsResponse?> GetPublicUserStatisticsAsync(string userId);
}