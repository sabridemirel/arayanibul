using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace API.Services;

/// <summary>
/// Validates Sign in with Apple identity tokens against Apple's published JWKS.
/// Registered as a singleton so signing keys are cached and refreshed by ConfigurationManager.
/// </summary>
public class AppleTokenValidator
{
    public const string AppleIssuer = "https://appleid.apple.com";
    private const string AppleMetadataAddress = "https://appleid.apple.com/.well-known/openid-configuration";

    private readonly IConfiguration _configuration;
    private readonly ILogger<AppleTokenValidator> _logger;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _configurationManager;

    public AppleTokenValidator(IConfiguration configuration, ILogger<AppleTokenValidator> logger)
    {
        _configuration = configuration;
        _logger = logger;
        _configurationManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            AppleMetadataAddress,
            new OpenIdConnectConfigurationRetriever(),
            new HttpDocumentRetriever { RequireHttps = true });
    }

    public async Task<AppleIdentity?> ValidateAsync(string identityToken, CancellationToken cancellationToken = default)
    {
        var audiences = _configuration.GetSection("OAuth:Apple:ClientIds").Get<string[]>()?
            .Where(a => !string.IsNullOrWhiteSpace(a))
            .ToArray() ?? Array.Empty<string>();

        if (audiences.Length == 0)
        {
            _logger.LogWarning("Apple login attempted but OAuth:Apple:ClientIds is not configured");
            return null;
        }

        try
        {
            var oidcConfig = await _configurationManager.GetConfigurationAsync(cancellationToken);
            var principal = Validate(identityToken, oidcConfig, audiences, out _);
            return principal;
        }
        catch (SecurityTokenSignatureKeyNotFoundException)
        {
            // Apple may have rotated keys; force a refresh and retry once.
            try
            {
                _configurationManager.RequestRefresh();
                var oidcConfig = await _configurationManager.GetConfigurationAsync(cancellationToken);
                return Validate(identityToken, oidcConfig, audiences, out _);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Apple identity token validation failed after key refresh");
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Apple identity token validation failed");
            return null;
        }
    }

    private static AppleIdentity? Validate(string identityToken, OpenIdConnectConfiguration oidcConfig, string[] audiences, out SecurityToken validatedToken)
    {
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = AppleIssuer,
            ValidateAudience = true,
            ValidAudiences = audiences,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            RequireSignedTokens = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = oidcConfig.SigningKeys,
            ClockSkew = TimeSpan.FromMinutes(2)
        };

        var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
        var principal = handler.ValidateToken(identityToken, parameters, out validatedToken);

        var sub = principal.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(sub))
        {
            return null;
        }

        var email = principal.FindFirst("email")?.Value;
        var emailVerifiedRaw = principal.FindFirst("email_verified")?.Value;
        var emailVerified = string.Equals(emailVerifiedRaw, "true", StringComparison.OrdinalIgnoreCase);
        var isPrivateRelay = string.Equals(principal.FindFirst("is_private_email")?.Value, "true", StringComparison.OrdinalIgnoreCase);

        return new AppleIdentity
        {
            Subject = sub,
            Email = string.IsNullOrWhiteSpace(email) ? null : email,
            EmailVerified = emailVerified,
            IsPrivateRelayEmail = isPrivateRelay
        };
    }
}

public class AppleIdentity
{
    public string Subject { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool EmailVerified { get; set; }
    public bool IsPrivateRelayEmail { get; set; }
}
