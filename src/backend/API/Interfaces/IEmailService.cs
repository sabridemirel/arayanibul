namespace API.Interfaces;

public interface IEmailService
{
    /// <summary>
    /// Sends an email. Never throws; returns false when sending failed.
    /// When Email:Host is not configured the message is logged instead of sent (development mode).
    /// </summary>
    Task<bool> SendEmailAsync(string toAddress, string subject, string htmlBody, string textBody);

    /// <summary>
    /// Sends the Turkish password reset email containing the given reset link.
    /// </summary>
    Task<bool> SendPasswordResetEmailAsync(string toAddress, string firstName, string resetLink);
}
