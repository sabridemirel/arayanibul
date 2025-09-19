using MobileApp.API.Models;

namespace MobileApp.API.Services;

public interface IJwtService
{
    Task<string> GenerateTokenAsync(ApplicationUser user);
}