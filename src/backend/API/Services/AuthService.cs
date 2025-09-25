using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using API.Models;
using API.Interfaces;
using API.Data;
using API.Middleware;
using Google.Apis.Auth;

namespace API.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;
    private readonly FacebookService _facebookService;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IConfiguration configuration,
        ApplicationDbContext context,
        FacebookService facebookService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
        _context = context;
        _facebookService = facebookService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var existingUser = await _userManager.FindByEmailAsync(dto.Email);
        if (existingUser != null)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Bu email zaten kullanılıyor."
            };
        }

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = string.Join(", ", result.Errors.Select(e => e.Description))
            };
        }

        var tokenResponse = await GenerateTokensAsync(user);
        return new AuthResponseDto
        {
            Success = true,
            Message = "Kayıt başarılı",
            Token = tokenResponse.AccessToken,
            RefreshToken = tokenResponse.RefreshToken,
            User = MapToUserDto(user)
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Geçersiz email veya şifre."
            };
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, false);
        if (!result.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Geçersiz email veya şifre."
            };
        }

        var tokenResponse = await GenerateTokensAsync(user);
        return new AuthResponseDto
        {
            Success = true,
            Message = "Giriş başarılı",
            Token = tokenResponse.AccessToken,
            RefreshToken = tokenResponse.RefreshToken,
            User = MapToUserDto(user)
        };
    }

    public async Task<AuthResponseDto> GuestLoginAsync()
    {
        var guestUser = new ApplicationUser
        {
            UserName = $"guest_{Guid.NewGuid()}",
            Email = $"guest_{Guid.NewGuid()}@guest.com",
            FirstName = "Misafir",
            LastName = "Kullanıcı",
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

        var tokenResponse = await GenerateTokensAsync(guestUser);
        return new AuthResponseDto
        {
            Success = true,
            Message = "Misafir girişi başarılı",
            Token = tokenResponse.AccessToken,
            RefreshToken = tokenResponse.RefreshToken,
            User = MapToUserDto(guestUser)
        };
    }

    private async Task<TokenResponseDto> GenerateTokensAsync(ApplicationUser user)
    {
        var accessToken = GenerateJwtToken(user);
        var refreshToken = await GenerateRefreshTokenAsync(user);
        
        return new TokenResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken.Token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15) // Access token expires in 15 minutes
        };
    }

    private string GenerateJwtToken(ApplicationUser user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var key = Encoding.ASCII.GetBytes(jwtSettings["Secret"]!);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
            new("isGuest", user.IsGuest.ToString())
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(15), // Short-lived access token
            Issuer = jwtSettings["Issuer"],
            Audience = jwtSettings["Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private async Task<RefreshToken> GenerateRefreshTokenAsync(ApplicationUser user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var refreshTokenExpiryDays = int.Parse(jwtSettings["RefreshTokenExpiryInDays"] ?? "30");
        
        // Revoke existing active refresh tokens for the user
        var existingTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == user.Id && rt.IsActive)
            .ToListAsync();
        
        foreach (var token in existingTokens)
        {
            token.IsRevoked = true;
        }

        var refreshToken = new RefreshToken
        {
            Token = GenerateSecureRandomToken(),
            UserId = user.Id,
            ExpiryDate = DateTime.UtcNow.AddDays(refreshTokenExpiryDays)
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        return refreshToken;
    }

    private static string GenerateSecureRandomToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    public async Task<AuthResponseDto> GoogleLoginAsync(string googleToken)
    {
        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(googleToken);
            
            var user = await _userManager.FindByEmailAsync(payload.Email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = payload.Email,
                    Email = payload.Email,
                    FirstName = payload.GivenName,
                    LastName = payload.FamilyName,
                    Provider = "Google",
                    EmailConfirmed = true
                };

                var result = await _userManager.CreateAsync(user);
                if (!result.Succeeded)
                {
                    return new AuthResponseDto
                    {
                        Success = false,
                        Message = "Google hesabı ile giriş yapılamadı."
                    };
                }
            }
            else if (user.Provider != "Google")
            {
                // Update provider if user exists with different provider
                user.Provider = "Google";
                await _userManager.UpdateAsync(user);
            }

            var tokenResponse = await GenerateTokensAsync(user);
            return new AuthResponseDto
            {
                Success = true,
                Message = "Google ile giriş başarılı",
                Token = tokenResponse.AccessToken,
                RefreshToken = tokenResponse.RefreshToken,
                User = MapToUserDto(user)
            };
        }
        catch (Exception)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Google token doğrulaması başarısız."
            };
        }
    }

    public async Task<AuthResponseDto> FacebookLoginAsync(string facebookToken)
    {
        try
        {
            var facebookUser = await _facebookService.ValidateTokenAsync(facebookToken);
            if (facebookUser == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Facebook token doğrulaması başarısız."
                };
            }

            var user = await _userManager.FindByEmailAsync(facebookUser.Email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = facebookUser.Email,
                    Email = facebookUser.Email,
                    FirstName = facebookUser.FirstName,
                    LastName = facebookUser.LastName,
                    Provider = "Facebook",
                    EmailConfirmed = true
                };

                var result = await _userManager.CreateAsync(user);
                if (!result.Succeeded)
                {
                    return new AuthResponseDto
                    {
                        Success = false,
                        Message = "Facebook hesabı ile giriş yapılamadı."
                    };
                }
            }
            else if (user.Provider != "Facebook")
            {
                // Update provider if user exists with different provider
                user.Provider = "Facebook";
                await _userManager.UpdateAsync(user);
            }

            var tokenResponse = await GenerateTokensAsync(user);
            return new AuthResponseDto
            {
                Success = true,
                Message = "Facebook ile giriş başarılı",
                Token = tokenResponse.AccessToken,
                RefreshToken = tokenResponse.RefreshToken,
                User = MapToUserDto(user)
            };
        }
        catch (Exception)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Facebook girişi sırasında bir hata oluştu."
            };
        }
    }

    public async Task<TokenResponseDto?> RefreshTokenAsync(string refreshToken)
    {
        var storedRefreshToken = await _context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

        if (storedRefreshToken == null || !storedRefreshToken.IsActive)
        {
            return null;
        }

        // Revoke the used refresh token
        storedRefreshToken.IsRevoked = true;
        
        // Generate new tokens
        var tokenResponse = await GenerateTokensAsync(storedRefreshToken.User);
        
        await _context.SaveChangesAsync();
        
        return tokenResponse;
    }

    public async Task<bool> LogoutAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user != null)
        {
            // Revoke all active refresh tokens for the user
            var activeTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == userId && rt.IsActive)
                .ToListAsync();
            
            foreach (var token in activeTokens)
            {
                token.IsRevoked = true;
            }
            
            await _context.SaveChangesAsync();
            await _signInManager.SignOutAsync();
            return true;
        }
        return false;
    }

    public Task<bool> ValidateTokenAsync(string token)
    {
        try
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var key = Encoding.ASCII.GetBytes(jwtSettings["Secret"]!);
            
            var tokenHandler = new JwtSecurityTokenHandler();
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = jwtSettings["Issuer"],
                ValidateAudience = true,
                ValidAudience = jwtSettings["Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            tokenHandler.ValidateToken(token, validationParameters, out SecurityToken validatedToken);
            return Task.FromResult(true);
        }
        catch
        {
            return Task.FromResult(false);
        }
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
}