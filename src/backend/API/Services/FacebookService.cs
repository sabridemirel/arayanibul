using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace API.Services;

public class FacebookService
{
    public const string LimitedLoginIssuer = "https://www.facebook.com";
    private const string LimitedLoginMetadataAddress = "https://limited.facebook.com/.well-known/openid-configuration/";

    // FacebookService is a transient typed HttpClient, so the OIDC metadata/JWKS cache must be static
    // to survive across requests. ConfigurationManager is thread-safe and refreshes keys periodically.
    private static readonly ConfigurationManager<OpenIdConnectConfiguration> LimitedLoginConfigurationManager =
        new(LimitedLoginMetadataAddress,
            new OpenIdConnectConfigurationRetriever(),
            new HttpDocumentRetriever { RequireHttps = true });

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FacebookService> _logger;

    public FacebookService(HttpClient httpClient, IConfiguration configuration, ILogger<FacebookService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Validates either a classic Facebook access token (Graph API debug_token) or, when the token is a
    /// JWT, an iOS Limited Login OIDC authentication token (FB iOS SDK 17+ without ATT permission).
    /// </summary>
    public Task<FacebookUserInfo?> ValidateTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        return IsJwt(token)
            ? ValidateLimitedLoginTokenAsync(token, cancellationToken)
            : ValidateAccessTokenAsync(token);
    }

    private static bool IsJwt(string token)
    {
        var parts = token.Split('.');
        if (parts.Length != 3)
        {
            return false;
        }

        foreach (var part in parts)
        {
            if (part.Length == 0 || !part.All(c => char.IsAsciiLetterOrDigit(c) || c == '-' || c == '_'))
            {
                return false;
            }
        }

        return true;
    }

    private async Task<FacebookUserInfo?> ValidateLimitedLoginTokenAsync(string authenticationToken, CancellationToken cancellationToken)
    {
        var appId = _configuration["OAuth:Facebook:AppId"];
        if (string.IsNullOrWhiteSpace(appId))
        {
            _logger.LogWarning("Facebook Limited Login attempted but OAuth:Facebook:AppId is not configured");
            return null;
        }

        // NOTE: the nonce embedded by the client is not verified here yet.
        try
        {
            var oidcConfig = await LimitedLoginConfigurationManager.GetConfigurationAsync(cancellationToken);
            return ValidateLimitedLoginToken(authenticationToken, oidcConfig, appId);
        }
        catch (SecurityTokenSignatureKeyNotFoundException)
        {
            // Facebook may have rotated keys; force a refresh and retry once.
            try
            {
                LimitedLoginConfigurationManager.RequestRefresh();
                var oidcConfig = await LimitedLoginConfigurationManager.GetConfigurationAsync(cancellationToken);
                return ValidateLimitedLoginToken(authenticationToken, oidcConfig, appId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Facebook Limited Login token validation failed after key refresh");
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Facebook Limited Login token validation failed");
            return null;
        }
    }

    private static FacebookUserInfo? ValidateLimitedLoginToken(string authenticationToken, OpenIdConnectConfiguration oidcConfig, string appId)
    {
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = LimitedLoginIssuer,
            ValidateAudience = true,
            ValidAudience = appId,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            RequireSignedTokens = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = oidcConfig.SigningKeys,
            ClockSkew = TimeSpan.FromMinutes(2)
        };

        var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
        var principal = handler.ValidateToken(authenticationToken, parameters, out _);

        var sub = principal.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(sub))
        {
            return null;
        }

        var email = principal.FindFirst("email")?.Value;
        var firstName = principal.FindFirst("given_name")?.Value;
        var lastName = principal.FindFirst("family_name")?.Value;

        if (string.IsNullOrWhiteSpace(firstName) && string.IsNullOrWhiteSpace(lastName))
        {
            var fullName = principal.FindFirst("name")?.Value?.Trim();
            if (!string.IsNullOrWhiteSpace(fullName))
            {
                var lastSpace = fullName.LastIndexOf(' ');
                firstName = lastSpace > 0 ? fullName[..lastSpace] : fullName;
                lastName = lastSpace > 0 ? fullName[(lastSpace + 1)..] : null;
            }
        }

        return new FacebookUserInfo
        {
            Id = sub,
            Email = string.IsNullOrWhiteSpace(email) ? null : email,
            FirstName = string.IsNullOrWhiteSpace(firstName) ? null : firstName,
            LastName = string.IsNullOrWhiteSpace(lastName) ? null : lastName
        };
    }

    private async Task<FacebookUserInfo?> ValidateAccessTokenAsync(string accessToken)
    {
        try
        {
            var appId = _configuration["OAuth:Facebook:AppId"];
            var appSecret = _configuration["OAuth:Facebook:AppSecret"];

            if (string.IsNullOrWhiteSpace(appId) || string.IsNullOrWhiteSpace(appSecret))
            {
                _logger.LogWarning("Facebook login attempted but OAuth:Facebook:AppId/AppSecret is not configured");
                return null;
            }

            var escapedToken = Uri.EscapeDataString(accessToken);
            var appAccessToken = Uri.EscapeDataString($"{appId}|{appSecret}");

            // Verify the token was issued for OUR app and is still valid
            var verifyUrl = $"https://graph.facebook.com/debug_token?input_token={escapedToken}&access_token={appAccessToken}";
            var verifyResponse = await _httpClient.GetAsync(verifyUrl);
            if (!verifyResponse.IsSuccessStatusCode)
            {
                return null;
            }

            var verifyContent = await verifyResponse.Content.ReadAsStringAsync();
            var verifyResult = JsonSerializer.Deserialize<FacebookTokenVerifyResponse>(verifyContent);
            var data = verifyResult?.Data;

            if (data == null || !data.IsValid)
            {
                return null;
            }

            if (!string.Equals(data.AppId, appId, StringComparison.Ordinal))
            {
                _logger.LogWarning("Facebook token was issued for a different app ({TokenAppId})", data.AppId);
                return null;
            }

            // Get user information
            var userUrl = $"https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token={escapedToken}";
            var userResponse = await _httpClient.GetAsync(userUrl);
            if (!userResponse.IsSuccessStatusCode)
            {
                return null;
            }

            var userContent = await userResponse.Content.ReadAsStringAsync();
            var userInfo = JsonSerializer.Deserialize<FacebookUserInfo>(userContent);

            if (userInfo == null || string.IsNullOrEmpty(userInfo.Id))
            {
                return null;
            }

            // The token's user must match the profile we fetched
            if (!string.IsNullOrEmpty(data.UserId) && !string.Equals(data.UserId, userInfo.Id, StringComparison.Ordinal))
            {
                return null;
            }

            return userInfo;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Facebook token validation failed");
            return null;
        }
    }
}

public class FacebookTokenVerifyResponse
{
    [JsonPropertyName("data")]
    public FacebookTokenData? Data { get; set; }
}

public class FacebookTokenData
{
    [JsonPropertyName("is_valid")]
    public bool IsValid { get; set; }

    [JsonPropertyName("app_id")]
    public string? AppId { get; set; }

    [JsonPropertyName("user_id")]
    public string? UserId { get; set; }
}

public class FacebookUserInfo
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    // Facebook only returns email when the user granted the permission and has a confirmed email
    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }

    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }
}
