using Microsoft.AspNetCore.Identity;
using MobileApp.API.Models;
using MobileApp.API.Models.DTOs;
using System.Text.Json;

namespace MobileApp.API.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IJwtService _jwtService;
    private readonly HttpClient _httpClient;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IJwtService jwtService,
        IHttpClientFactory httpClientFactory)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtService = jwtService;
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    {
        var existingUser = await _userManager.FindByEmailAsync(registerDto.Email);
        if (existingUser != null)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Bu email adresi zaten kullanılıyor."
            };
        }

        var user = new ApplicationUser
        {
            UserName = registerDto.Email,
            Email = registerDto.Email,
            FirstName = registerDto.FirstName,
            LastName = registerDto.LastName,
            Provider = "Local",
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, registerDto.Password);
        if (!result.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = string.Join(", ", result.Errors.Select(e => e.Description))
            };
        }

        var token = await _jwtService.GenerateTokenAsync(user);
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return new AuthResponseDto
        {
            Success = true,
            Message = "Kayıt başarılı",
            Token = token,
            User = MapToUserDto(user)
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
    {
        var user = await _userManager.FindByEmailAsync(loginDto.Email);
        if (user == null)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Geçersiz email veya şifre."
            };
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, loginDto.Password, false);
        if (!result.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Geçersiz email veya şifre."
            };
        }

        var token = await _jwtService.GenerateTokenAsync(user);
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return new AuthResponseDto
        {
            Success = true,
            Message = "Giriş başarılı",
            Token = token,
            User = MapToUserDto(user)
        };
    }

    public async Task<AuthResponseDto> SocialLoginAsync(SocialLoginDto socialLoginDto)
    {
        try
        {
            // Token doğrulama ve kullanıcı bilgilerini alma
            var userInfo = await ValidateSocialTokenAsync(socialLoginDto.Provider, socialLoginDto.AccessToken);
            if (userInfo == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Geçersiz sosyal medya token'ı."
                };
            }

            // Mevcut kullanıcıyı kontrol et
            var existingUser = await _userManager.FindByEmailAsync(userInfo.Email);
            if (existingUser != null)
            {
                // Kullanıcı mevcut, giriş yap
                var token = await _jwtService.GenerateTokenAsync(existingUser);
                existingUser.LastLoginAt = DateTime.UtcNow;
                await _userManager.UpdateAsync(existingUser);

                return new AuthResponseDto
                {
                    Success = true,
                    Message = "Giriş başarılı",
                    Token = token,
                    User = MapToUserDto(existingUser)
                };
            }

            // Yeni kullanıcı oluştur
            var newUser = new ApplicationUser
            {
                UserName = userInfo.Email,
                Email = userInfo.Email,
                FirstName = userInfo.FirstName,
                LastName = userInfo.LastName,
                Provider = socialLoginDto.Provider,
                ProviderId = userInfo.Id,
                EmailConfirmed = true
            };

            var result = await _userManager.CreateAsync(newUser);
            if (!result.Succeeded)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Kullanıcı oluşturulamadı."
                };
            }

            var newToken = await _jwtService.GenerateTokenAsync(newUser);
            newUser.LastLoginAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(newUser);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Kayıt ve giriş başarılı",
                Token = newToken,
                User = MapToUserDto(newUser)
            };
        }
        catch (Exception ex)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Sosyal medya girişi sırasında hata oluştu."
            };
        }
    }

    public async Task<AuthResponseDto> GuestLoginAsync()
    {
        var guestUser = new ApplicationUser
        {
            UserName = $"guest_{Guid.NewGuid()}",
            Email = $"guest_{Guid.NewGuid()}@guest.com",
            FirstName = "Misafir",
            LastName = "Kullanıcı",
            Provider = "Guest",
            IsGuest = true,
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(guestUser);
        if (!result.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Misafir girişi oluşturulamadı."
            };
        }

        var token = await _jwtService.GenerateTokenAsync(guestUser);
        guestUser.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(guestUser);

        return new AuthResponseDto
        {
            Success = true,
            Message = "Misafir girişi başarılı",
            Token = token,
            User = MapToUserDto(guestUser)
        };
    }

    public async Task<UserDto?> GetUserByIdAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        return user != null ? MapToUserDto(user) : null;
    }

    private async Task<SocialUserInfo?> ValidateSocialTokenAsync(string provider, string accessToken)
    {
        try
        {
            if (provider.ToLower() == "google")
            {
                var response = await _httpClient.GetAsync($"https://www.googleapis.com/oauth2/v2/userinfo?access_token={accessToken}");
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var googleUser = JsonSerializer.Deserialize<GoogleUserInfo>(json);
                    return new SocialUserInfo
                    {
                        Id = googleUser.id,
                        Email = googleUser.email,
                        FirstName = googleUser.given_name,
                        LastName = googleUser.family_name
                    };
                }
            }
            // Facebook için benzer implementasyon eklenebilir
        }
        catch
        {
            // Log error
        }

        return null;
    }

    private UserDto MapToUserDto(ApplicationUser user)
    {
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email!,
            FirstName = user.FirstName ?? "",
            LastName = user.LastName ?? "",
            Provider = user.Provider ?? "Local",
            IsGuest = user.IsGuest
        };
    }

    private class SocialUserInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
    }

    private class GoogleUserInfo
    {
        public string id { get; set; } = string.Empty;
        public string email { get; set; } = string.Empty;
        public string given_name { get; set; } = string.Empty;
        public string family_name { get; set; } = string.Empty;
    }
}