using MobileApp.API.Models;
using MobileApp.API.Models.DTOs;

namespace MobileApp.API.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);
    Task<AuthResponseDto> LoginAsync(LoginDto loginDto);
    Task<AuthResponseDto> SocialLoginAsync(SocialLoginDto socialLoginDto);
    Task<AuthResponseDto> GuestLoginAsync();
    Task<UserDto?> GetUserByIdAsync(string userId);
}