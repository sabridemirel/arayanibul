using API.Models;

namespace API.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<AuthResponseDto> GuestLoginAsync();
    Task<AuthResponseDto> ConvertGuestToUserAsync(string guestId, RegisterDto registerDto);
    Task<AuthResponseDto> GoogleLoginAsync(string googleToken);
    Task<AuthResponseDto> FacebookLoginAsync(string facebookToken);
    Task<AuthResponseDto> AppleLoginAsync(AppleLoginDto dto);
    /// <summary>Sends a reset link if a password account exists. Never throws, never reveals existence.</summary>
    Task ForgotPasswordAsync(string? email);
    Task<(bool Success, string Message)> ResetPasswordAsync(string? email, string? token, string? newPassword);
    Task<TokenResponseDto?> RefreshTokenAsync(string refreshToken);
    Task<bool> LogoutAsync(string userId);
    Task<bool> ValidateTokenAsync(string token);
    Task CleanupExpiredGuestSessionsAsync();
}