using API.Models;

namespace API.Interfaces;

public interface IUserService
{
    Task<ApplicationUser?> GetUserProfileAsync(string userId);
    Task<ApplicationUser?> UpdateUserProfileAsync(string userId, UpdateProfileRequest request);
    Task<string?> UploadProfileImageAsync(string userId, IFormFile imageFile);
    Task<bool> DeleteProfileImageAsync(string userId);
}