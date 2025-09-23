using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using API.Models;

namespace API.Services;

public class AuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _configuration;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
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

        var token = GenerateJwtToken(user);
        return new AuthResponseDto
        {
            Success = true,
            Message = "Kayıt başarılı",
            Token = token,
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

        var token = GenerateJwtToken(user);
        return new AuthResponseDto
        {
            Success = true,
            Message = "Giriş başarılı",
            Token = token,
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

        var token = GenerateJwtToken(guestUser);
        return new AuthResponseDto
        {
            Success = true,
            Message = "Misafir girişi başarılı",
            Token = token,
            User = MapToUserDto(guestUser)
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
            Expires = DateTime.UtcNow.AddDays(7),
            Issuer = jwtSettings["Issuer"],
            Audience = jwtSettings["Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
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