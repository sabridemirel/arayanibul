using API.Interfaces;

namespace API.Services;

/// <summary>
/// Mock SMS service for development/testing
/// In production, replace with real SMS provider (Twilio, Netgsm, etc.)
/// </summary>
public class MockSmsService : ISmsService
{
    private readonly ILogger<MockSmsService> _logger;
    private readonly IConfiguration _configuration;

    public MockSmsService(ILogger<MockSmsService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<bool> SendSmsAsync(string phoneNumber, string message)
    {
        try
        {
            // In production, this would call actual SMS provider API
            // For now, just log the message
            _logger.LogInformation(
                "MOCK SMS - Would send to {PhoneNumber}: {Message}",
                phoneNumber,
                message
            );

            // Simulate network delay
            await Task.Delay(500);

            // In development, always succeed
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending SMS to {PhoneNumber}", phoneNumber);
            return false;
        }
    }

    public async Task<bool> SendVerificationCodeAsync(string phoneNumber, string code)
    {
        var message = $"Arayanibul doğrulama kodunuz: {code}. Bu kodu kimseyle paylaşmayın.";

        _logger.LogWarning(
            "MOCK SMS VERIFICATION CODE - Phone: {PhoneNumber}, Code: {Code}",
            phoneNumber,
            code
        );

        return await SendSmsAsync(phoneNumber, message);
    }
}

/// <summary>
/// Real SMS service implementation (placeholder for production use)
/// To implement: Add Twilio, Netgsm, or other SMS provider
/// </summary>
public class RealSmsService : ISmsService
{
    private readonly ILogger<RealSmsService> _logger;
    private readonly IConfiguration _configuration;

    public RealSmsService(ILogger<RealSmsService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<bool> SendSmsAsync(string phoneNumber, string message)
    {
        try
        {
            // TODO: Implement real SMS provider integration
            // Example for Twilio:
            // var accountSid = _configuration["Twilio:AccountSid"];
            // var authToken = _configuration["Twilio:AuthToken"];
            // var fromNumber = _configuration["Twilio:FromNumber"];
            // TwilioClient.Init(accountSid, authToken);
            // var messageResource = await MessageResource.CreateAsync(
            //     body: message,
            //     from: new PhoneNumber(fromNumber),
            //     to: new PhoneNumber(phoneNumber)
            // );
            // return messageResource.ErrorCode == null;

            _logger.LogWarning("RealSmsService not implemented. Using mock behavior.");
            await Task.Delay(500);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending SMS to {PhoneNumber}", phoneNumber);
            return false;
        }
    }

    public async Task<bool> SendVerificationCodeAsync(string phoneNumber, string code)
    {
        var message = $"Arayanibul doğrulama kodunuz: {code}. Bu kodu kimseyle paylaşmayın.";
        return await SendSmsAsync(phoneNumber, message);
    }
}