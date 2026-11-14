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
    private readonly AppleTokenValidator _appleTokenValidator;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthService> _logger;
    private readonly AdminRoleService _adminRoleService;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IConfiguration configuration,
        ApplicationDbContext context,
        FacebookService facebookService,
        AppleTokenValidator appleTokenValidator,
        IEmailService emailService,
        ILogger<AuthService> logger,
        AdminRoleService adminRoleService)
    {
        _adminRoleService = adminRoleService;
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
        _context = context;
        _facebookService = facebookService;
        _appleTokenValidator = appleTokenValidator;
        _emailService = emailService;
        _logger = logger;
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
            // Ownership is not proven at registration; confirmed later via password reset link,
            // email verification or a verified social sign-in.
            EmailConfirmed = false
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
            User = await MapToUserDtoAsync(user)
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
        if (result.IsLockedOut && user.SuspendedAt.HasValue)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Hesabınız askıya alınmıştır. Destek için bizimle iletişime geçebilirsiniz."
            };
        }

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
            User = await MapToUserDtoAsync(user)
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
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
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
            User = await MapToUserDtoAsync(guestUser)
        };
    }

    public async Task<AuthResponseDto> ConvertGuestToUserAsync(string guestId, RegisterDto registerDto)
    {
        var guestUser = await _userManager.FindByIdAsync(guestId);
        if (guestUser == null || !guestUser.IsGuest)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Geçersiz misafir kullanıcı."
            };
        }

        // Check if email is already in use by another user
        var existingUser = await _userManager.FindByEmailAsync(registerDto.Email);
        if (existingUser != null && existingUser.Id != guestId)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Bu email zaten kullanılıyor."
            };
        }

        // Update guest user to regular user
        guestUser.UserName = registerDto.Email;
        guestUser.Email = registerDto.Email;
        guestUser.FirstName = registerDto.FirstName;
        guestUser.LastName = registerDto.LastName;
        guestUser.IsGuest = false;
        guestUser.EmailConfirmed = false; // the new address is not verified yet
        guestUser.UpdatedAt = DateTime.UtcNow;
        guestUser.Provider = "Local";

        // Add password to the guest user
        var token = await _userManager.GeneratePasswordResetTokenAsync(guestUser);
        var passwordResult = await _userManager.ResetPasswordAsync(guestUser, token, registerDto.Password);
        
        if (!passwordResult.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = string.Join(", ", passwordResult.Errors.Select(e => e.Description))
            };
        }

        var updateResult = await _userManager.UpdateAsync(guestUser);
        if (!updateResult.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Kullanıcı dönüşümü başarısız."
            };
        }

        // Generate new tokens for the converted user
        var tokenResponse = await GenerateTokensAsync(guestUser);
        return new AuthResponseDto
        {
            Success = true,
            Message = "Hesap başarıyla oluşturuldu",
            Token = tokenResponse.AccessToken,
            RefreshToken = tokenResponse.RefreshToken,
            User = await MapToUserDtoAsync(guestUser)
        };
    }

    private async Task<TokenResponseDto> GenerateTokensAsync(ApplicationUser user)
    {
        // Grant the Admin role on login/register when the email is configured as an admin email.
        await _adminRoleService.EnsureAdminIfConfiguredAsync(user);
        var roles = await _userManager.GetRolesAsync(user);
        var accessToken = GenerateJwtToken(user, roles);
        var refreshToken = await GenerateRefreshTokenAsync(user);
        
        return new TokenResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken.Token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15) // Access token expires in 15 minutes
        };
    }

    private string GenerateJwtToken(ApplicationUser user, IEnumerable<string> roles)
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
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

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
        
        // Each device keeps its own session: a refresh only revokes the token it used (see
        // RefreshTokenAsync). Revoking every other active token here signed the user out of
        // their other devices (phone + web) on each login or 15-minute refresh. Cap the number
        // of concurrent sessions instead, dropping the oldest.
        const int maxActiveSessions = 10;
        var oldTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == user.Id && !rt.IsRevoked && rt.ExpiryDate > DateTime.UtcNow)
            .OrderByDescending(rt => rt.CreatedAt)
            .Skip(maxActiveSessions - 1)
            .ToListAsync();

        foreach (var token in oldTokens)
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
        if (string.IsNullOrWhiteSpace(googleToken))
        {
            return Fail("Google token doğrulaması başarısız.");
        }

        var clientIds = GetGoogleClientIds();
        if (clientIds.Length == 0)
        {
            _logger.LogWarning("Google login attempted but no OAuth:Google:ClientIds / ClientId is configured");
            return Fail("Google ile giriş şu anda kullanılamıyor.");
        }

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(googleToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = clientIds
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Google ID token validation failed");
            return Fail("Google token doğrulaması başarısız.");
        }

        if (string.IsNullOrEmpty(payload.Subject))
        {
            return Fail("Google token doğrulaması başarısız.");
        }

        if (!payload.EmailVerified || string.IsNullOrWhiteSpace(payload.Email))
        {
            return Fail("Google hesabınızın e-posta adresi doğrulanmamış.");
        }

        try
        {
            return await SocialSignInAsync(
                SocialProvider.Google,
                payload.Subject,
                payload.Email,
                emailVerified: true,
                payload.GivenName,
                payload.FamilyName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google login failed");
            return Fail("Google hesabı ile giriş yapılamadı.");
        }
    }

    public async Task<AuthResponseDto> FacebookLoginAsync(string facebookToken)
    {
        if (string.IsNullOrWhiteSpace(facebookToken))
        {
            return Fail("Facebook token doğrulaması başarısız.");
        }

        try
        {
            // Accepts a classic access token or an iOS Limited Login authentication token (JWT).
            var facebookUser = await _facebookService.ValidateTokenAsync(facebookToken.Trim());
            if (facebookUser == null)
            {
                return Fail("Facebook token doğrulaması başarısız.");
            }

            // Facebook only returns confirmed email addresses (Graph API and Limited Login alike),
            // so a returned email counts as verified.
            return await SocialSignInAsync(
                SocialProvider.Facebook,
                facebookUser.Id,
                facebookUser.Email,
                emailVerified: !string.IsNullOrWhiteSpace(facebookUser.Email),
                facebookUser.FirstName,
                facebookUser.LastName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Facebook login failed");
            return Fail("Facebook girişi sırasında bir hata oluştu.");
        }
    }

    public async Task<AuthResponseDto> AppleLoginAsync(AppleLoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.IdentityToken))
        {
            return Fail("Apple token doğrulaması başarısız.");
        }

        var identity = await _appleTokenValidator.ValidateAsync(dto.IdentityToken);
        if (identity == null)
        {
            return Fail("Apple token doğrulaması başarısız.");
        }

        try
        {
            return await SocialSignInAsync(
                SocialProvider.Apple,
                identity.Subject,
                identity.Email,
                identity.EmailVerified && !string.IsNullOrWhiteSpace(identity.Email),
                dto.FirstName,
                dto.LastName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Apple login failed");
            return Fail("Apple hesabı ile giriş yapılamadı.");
        }
    }

    private enum SocialProvider
    {
        Google,
        Facebook,
        Apple
    }

    private string[] GetGoogleClientIds()
    {
        var ids = _configuration.GetSection("OAuth:Google:ClientIds").Get<string[]>() ?? Array.Empty<string>();
        var legacy = _configuration["OAuth:Google:ClientId"];

        return ids.Append(legacy)
            .Where(id => !string.IsNullOrWhiteSpace(id) && !id!.StartsWith("your-", StringComparison.OrdinalIgnoreCase))
            .Select(id => id!.Trim())
            .Distinct()
            .ToArray();
    }

    private static string? GetProviderId(ApplicationUser user, SocialProvider provider) => provider switch
    {
        SocialProvider.Google => user.GoogleId,
        SocialProvider.Facebook => user.FacebookId,
        SocialProvider.Apple => user.AppleId,
        _ => null
    };

    private static void SetProviderId(ApplicationUser user, SocialProvider provider, string providerId)
    {
        switch (provider)
        {
            case SocialProvider.Google: user.GoogleId = providerId; break;
            case SocialProvider.Facebook: user.FacebookId = providerId; break;
            case SocialProvider.Apple: user.AppleId = providerId; break;
        }
    }

    private Task<ApplicationUser?> FindByProviderIdAsync(SocialProvider provider, string providerId) => provider switch
    {
        SocialProvider.Google => _userManager.Users.FirstOrDefaultAsync(u => u.GoogleId == providerId),
        SocialProvider.Facebook => _userManager.Users.FirstOrDefaultAsync(u => u.FacebookId == providerId),
        SocialProvider.Apple => _userManager.Users.FirstOrDefaultAsync(u => u.AppleId == providerId),
        _ => Task.FromResult<ApplicationUser?>(null)
    };

    private static string PlaceholderEmail(SocialProvider provider, string providerId)
    {
        var prefix = provider switch
        {
            SocialProvider.Google => "google",
            SocialProvider.Facebook => "fb",
            SocialProvider.Apple => "apple",
            _ => "social"
        };
        return $"{prefix}-{providerId}@users.arayanibul.local".ToLowerInvariant();
    }

    /// <summary>
    /// Shared sign-in logic for social providers.
    /// Lookup order: provider subject id, then (only for provider-verified emails) email.
    /// </summary>
    private async Task<AuthResponseDto> SocialSignInAsync(
        SocialProvider provider,
        string providerId,
        string? email,
        bool emailVerified,
        string? firstName,
        string? lastName)
    {
        var providerName = provider.ToString();
        firstName = NormalizeName(firstName);
        lastName = NormalizeName(lastName);
        email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();

        // 1) Lookup by stable provider id
        var user = await FindByProviderIdAsync(provider, providerId);

        if (user != null)
        {
            if (await _userManager.IsLockedOutAsync(user))
            {
                return Fail("Bu hesap kullanılamıyor.");
            }

            // Apple only sends the name on the first sign-in; fill it in if we never got it.
            var changed = false;
            if (firstName != null && string.IsNullOrWhiteSpace(user.FirstName))
            {
                user.FirstName = firstName;
                changed = true;
            }
            if (lastName != null && string.IsNullOrWhiteSpace(user.LastName))
            {
                user.LastName = lastName;
                changed = true;
            }
            if (changed)
            {
                user.UpdatedAt = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);
            }

            return await SuccessResponseAsync(user, $"{providerName} ile giriş başarılı");
        }

        // 2) Link to an existing account by email — only when the provider asserts a verified email
        if (email != null && emailVerified)
        {
            var existing = await _userManager.FindByEmailAsync(email);
            if (existing != null && !existing.IsGuest)
            {
                if (await _userManager.IsLockedOutAsync(existing))
                {
                    return Fail("Bu hesap kullanılamıyor.");
                }

                var existingProviderId = GetProviderId(existing, provider);
                if (!string.IsNullOrEmpty(existingProviderId) && existingProviderId != providerId)
                {
                    // The account is already bound to a different identity at this provider.
                    return Fail($"Bu e-posta adresi başka bir {providerName} hesabıyla ilişkilendirilmiş.");
                }

                if (!existing.EmailConfirmed)
                {
                    // Someone may have pre-registered this email without proving ownership.
                    // The provider has now proven ownership: drop the unverified password and sessions.
                    if (await _userManager.HasPasswordAsync(existing))
                    {
                        var removeResult = await _userManager.RemovePasswordAsync(existing);
                        if (!removeResult.Succeeded)
                        {
                            return Fail($"{providerName} hesabı ile giriş yapılamadı.");
                        }
                    }

                    await RevokeAllRefreshTokensAsync(existing.Id);
                    existing.EmailConfirmed = true;
                }

                SetProviderId(existing, provider, providerId);

                // Keep "Local" for accounts that still have a password; otherwise record the provider.
                if (!await _userManager.HasPasswordAsync(existing) &&
                    (string.IsNullOrEmpty(existing.Provider) || existing.Provider == "Local"))
                {
                    existing.Provider = providerName;
                }

                if (firstName != null && string.IsNullOrWhiteSpace(existing.FirstName)) existing.FirstName = firstName;
                if (lastName != null && string.IsNullOrWhiteSpace(existing.LastName)) existing.LastName = lastName;
                existing.UpdatedAt = DateTime.UtcNow;

                var updateResult = await _userManager.UpdateAsync(existing);
                if (!updateResult.Succeeded)
                {
                    return Fail($"{providerName} hesabı ile giriş yapılamadı.");
                }

                return await SuccessResponseAsync(existing, $"{providerName} ile giriş başarılı");
            }
        }

        // 3) Create a new account. Use the real email only when verified and not already taken.
        var useRealEmail = email != null && emailVerified && await _userManager.FindByEmailAsync(email) == null;
        var accountEmail = useRealEmail ? email! : PlaceholderEmail(provider, providerId);

        user = new ApplicationUser
        {
            UserName = accountEmail,
            Email = accountEmail,
            FirstName = firstName ?? string.Empty,
            LastName = lastName ?? string.Empty,
            Provider = providerName,
            EmailConfirmed = useRealEmail,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        SetProviderId(user, provider, providerId);

        var result = await _userManager.CreateAsync(user);
        if (!result.Succeeded && useRealEmail)
        {
            // e.g. the email contains characters not allowed in a user name — fall back to a safe user name
            user.UserName = PlaceholderEmail(provider, providerId);
            result = await _userManager.CreateAsync(user);
        }

        if (!result.Succeeded)
        {
            _logger.LogWarning("Creating {Provider} user failed: {Errors}", providerName,
                string.Join(", ", result.Errors.Select(e => e.Code)));
            return Fail($"{providerName} hesabı ile giriş yapılamadı.");
        }

        return await SuccessResponseAsync(user, $"{providerName} ile giriş başarılı");
    }

    private static string? NormalizeName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        name = name.Trim();
        return name.Length > 50 ? name[..50] : name;
    }

    private async Task<AuthResponseDto> SuccessResponseAsync(ApplicationUser user, string message)
    {
        var tokenResponse = await GenerateTokensAsync(user);
        return new AuthResponseDto
        {
            Success = true,
            Message = message,
            Token = tokenResponse.AccessToken,
            RefreshToken = tokenResponse.RefreshToken,
            User = await MapToUserDtoAsync(user)
        };
    }

    private static AuthResponseDto Fail(string message) => new() { Success = false, Message = message };

    private async Task RevokeAllRefreshTokensAsync(string userId)
    {
        var activeTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked)
            .ToListAsync();

        foreach (var token in activeTokens)
        {
            token.IsRevoked = true;
        }

        await _context.SaveChangesAsync();
    }

    // ---------------- Password reset ----------------

    public async Task ForgotPasswordAsync(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return;
        }

        try
        {
            var user = await _userManager.FindByEmailAsync(email.Trim());
            if (user == null || user.IsGuest || await _userManager.IsLockedOutAsync(user) || !await _userManager.HasPasswordAsync(user))
            {
                // Never reveal whether the account exists; social-only accounts have no password to reset.
                return;
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var baseUrl = (_configuration["App:WebBaseUrl"] is { Length: > 0 } configured ? configured : "http://localhost:3000").TrimEnd('/');
            var link = $"{baseUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}";

            await _emailService.SendPasswordResetEmailAsync(user.Email!, user.FirstName, link);
        }
        catch (Exception ex)
        {
            // Swallow: the endpoint must always answer the same way
            _logger.LogError(ex, "Forgot password processing failed");
        }
    }

    public async Task<(bool Success, string Message)> ResetPasswordAsync(string? email, string? token, string? newPassword)
    {
        const string invalidLink = "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin.";

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token))
        {
            return (false, invalidLink);
        }

        if (string.IsNullOrEmpty(newPassword))
        {
            return (false, "Lütfen yeni şifrenizi girin.");
        }

        if (newPassword.Length > 100)
        {
            return (false, "Şifre en fazla 100 karakter olabilir.");
        }

        var user = await _userManager.FindByEmailAsync(email.Trim());
        if (user == null || user.IsGuest || await _userManager.IsLockedOutAsync(user))
        {
            return (false, invalidLink);
        }

        var result = await _userManager.ResetPasswordAsync(user, token, newPassword);
        if (!result.Succeeded)
        {
            if (result.Errors.Any(e => e.Code == "InvalidToken"))
            {
                return (false, invalidLink);
            }

            return (false, string.Join(" ", result.Errors.Select(TranslateIdentityError).Distinct()));
        }

        // A successful reset proves email ownership
        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);
        }

        await _adminRoleService.EnsureAdminIfConfiguredAsync(user);

        await RevokeAllRefreshTokensAsync(user.Id);

        return (true, "Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.");
    }

    private static string TranslateIdentityError(IdentityError error) => error.Code switch
    {
        "PasswordTooShort" => "Şifre en az 6 karakter olmalıdır.",
        "PasswordRequiresDigit" => "Şifre en az bir rakam içermelidir.",
        "PasswordRequiresLower" => "Şifre en az bir küçük harf içermelidir.",
        "PasswordRequiresUpper" => "Şifre en az bir büyük harf içermelidir.",
        "PasswordRequiresNonAlphanumeric" => "Şifre en az bir özel karakter içermelidir.",
        "PasswordRequiresUniqueChars" => "Şifre daha fazla farklı karakter içermelidir.",
        _ => error.Description
    };

    public async Task<TokenResponseDto?> RefreshTokenAsync(string refreshToken)
    {
        var storedRefreshToken = await _context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

        if (storedRefreshToken == null || !storedRefreshToken.IsActive)
        {
            return null;
        }

        if (await _userManager.IsLockedOutAsync(storedRefreshToken.User))
        {
            storedRefreshToken.IsRevoked = true;
            await _context.SaveChangesAsync();
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
                .Where(rt => rt.UserId == userId && !rt.IsRevoked && rt.ExpiryDate > DateTime.UtcNow)
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

    public async Task CleanupExpiredGuestSessionsAsync()
    {
        // Clean up guest users older than 7 days
        var cutoffDate = DateTime.UtcNow.AddDays(-7);
        
        var expiredGuestUsers = await _context.Users
            .Where(u => u.IsGuest && u.CreatedAt < cutoffDate)
            .ToListAsync();

        if (expiredGuestUsers.Any())
        {
            // First, clean up related refresh tokens
            var guestUserIds = expiredGuestUsers.Select(u => u.Id).ToList();
            var expiredTokens = await _context.RefreshTokens
                .Where(rt => guestUserIds.Contains(rt.UserId))
                .ToListAsync();
            
            _context.RefreshTokens.RemoveRange(expiredTokens);

            // Remove the guest users
            foreach (var guestUser in expiredGuestUsers)
            {
                await _userManager.DeleteAsync(guestUser);
            }

            await _context.SaveChangesAsync();
        }
    }

    private async Task<UserDto> MapToUserDtoAsync(ApplicationUser user)
    {
        var roles = (await _userManager.GetRolesAsync(user)).ToArray();
        return new UserDto
        {
            Roles = roles,
            IsAdmin = roles.Contains(AppRoles.Admin),
            Id = user.Id,
            Email = user.Email!,
            FirstName = user.FirstName ?? "",
            LastName = user.LastName ?? "",
            Provider = user.Provider ?? "Local",
            IsGuest = user.IsGuest
        };
    }
}