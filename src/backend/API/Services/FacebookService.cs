using System.Text.Json;

namespace API.Services;

public class FacebookService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public FacebookService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<FacebookUserInfo?> ValidateTokenAsync(string accessToken)
    {
        try
        {
            var appId = _configuration["OAuth:Facebook:AppId"];
            var appSecret = _configuration["OAuth:Facebook:AppSecret"];
            
            // First, verify the token with Facebook
            var verifyUrl = $"https://graph.facebook.com/debug_token?input_token={accessToken}&access_token={appId}|{appSecret}";
            var verifyResponse = await _httpClient.GetAsync(verifyUrl);
            
            if (!verifyResponse.IsSuccessStatusCode)
            {
                return null;
            }

            var verifyContent = await verifyResponse.Content.ReadAsStringAsync();
            var verifyResult = JsonSerializer.Deserialize<FacebookTokenVerifyResponse>(verifyContent);
            
            if (verifyResult?.Data?.IsValid != true)
            {
                return null;
            }

            // Get user information
            var userUrl = $"https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token={accessToken}";
            var userResponse = await _httpClient.GetAsync(userUrl);
            
            if (!userResponse.IsSuccessStatusCode)
            {
                return null;
            }

            var userContent = await userResponse.Content.ReadAsStringAsync();
            var userInfo = JsonSerializer.Deserialize<FacebookUserInfo>(userContent);
            
            return userInfo;
        }
        catch
        {
            return null;
        }
    }
}

public class FacebookTokenVerifyResponse
{
    public FacebookTokenData? Data { get; set; }
}

public class FacebookTokenData
{
    public bool IsValid { get; set; }
}

public class FacebookUserInfo
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
}