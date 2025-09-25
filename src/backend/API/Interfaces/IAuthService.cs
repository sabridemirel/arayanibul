using API.Models;

namespace API.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<AuthResponseDto> GuestLoginAsync();
    Task<AuthResponseDto> GoogleLoginAsync(string googleToken);
    Task<AuthResponseDto> FacebookLoginAsync(string facebookToken);
    Task<TokenResponseDto?> RefreshTokenAsync(string refreshToken);
    Task<bool> LogoutAsync(string userId);
    Task<bool> ValidateTokenAsync(string token);
}