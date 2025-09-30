namespace API.Interfaces;

/// <summary>
/// Service for sending SMS messages
/// </summary>
public interface ISmsService
{
    /// <summary>
    /// Sends an SMS message to the specified phone number
    /// </summary>
    /// <param name="phoneNumber">Recipient phone number in international format (e.g., +905551234567)</param>
    /// <param name="message">SMS message content</param>
    /// <returns>True if SMS was sent successfully, false otherwise</returns>
    Task<bool> SendSmsAsync(string phoneNumber, string message);

    /// <summary>
    /// Sends a verification code via SMS
    /// </summary>
    /// <param name="phoneNumber">Recipient phone number in international format</param>
    /// <param name="code">Verification code to send</param>
    /// <returns>True if SMS was sent successfully, false otherwise</returns>
    Task<bool> SendVerificationCodeAsync(string phoneNumber, string code);
}