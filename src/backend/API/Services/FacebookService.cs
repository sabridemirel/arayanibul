using System.Text.Json;
using System.Text.Json.Serialization;

namespace API.Services;

public class FacebookService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FacebookService> _logger;

    public FacebookService(HttpClient httpClient, IConfiguration configuration, ILogger<FacebookService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<FacebookUserInfo?> ValidateTokenAsync(string accessToken)
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
