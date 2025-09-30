using API.Models;

namespace API.Interfaces;

/// <summary>
/// Service for handling user verification requests
/// </summary>
public interface IVerificationService
{
    /// <summary>
    /// Submits a verification request with optional document uploads
    /// </summary>
    /// <param name="userId">ID of the user submitting verification</param>
    /// <param name="type">Type of verification</param>
    /// <param name="documents">Optional document files for Identity/Business verification</param>
    /// <param name="notes">Optional notes from user</param>
    /// <returns>Created verification record</returns>
    Task<UserVerification> SubmitVerificationRequestAsync(
        string userId,
        VerificationType type,
        List<IFormFile>? documents = null,
        string? notes = null
    );

    /// <summary>
    /// Sends email verification code to user's registered email
    /// </summary>
    /// <param name="userId">ID of the user</param>
    /// <returns>Verification code response with expiration time</returns>
    Task<VerificationCodeResponse> SendEmailVerificationCodeAsync(string userId);

    /// <summary>
    /// Sends SMS verification code to user's registered phone
    /// </summary>
    /// <param name="userId">ID of the user</param>
    /// <returns>Verification code response with expiration time</returns>
    Task<VerificationCodeResponse> SendPhoneVerificationCodeAsync(string userId);

    /// <summary>
    /// Verifies email with provided code
    /// </summary>
    /// <param name="userId">ID of the user</param>
    /// <param name="email">Email address to verify</param>
    /// <param name="code">Verification code</param>
    /// <returns>Verification result</returns>
    Task<VerificationResultResponse> VerifyEmailCodeAsync(string userId, string email, string code);

    /// <summary>
    /// Verifies phone with provided code
    /// </summary>
    /// <param name="userId">ID of the user</param>
    /// <param name="phoneNumber">Phone number to verify</param>
    /// <param name="code">Verification code</param>
    /// <returns>Verification result</returns>
    Task<VerificationResultResponse> VerifyPhoneCodeAsync(string userId, string phoneNumber, string code);

    /// <summary>
    /// Gets all verification records for a user
    /// </summary>
    /// <param name="userId">ID of the user</param>
    /// <returns>User verifications with badges</returns>
    Task<UserVerificationsResponse> GetUserVerificationsAsync(string userId);

    /// <summary>
    /// Gets a specific verification record
    /// </summary>
    /// <param name="verificationId">ID of the verification</param>
    /// <param name="userId">ID of the user (for authorization)</param>
    /// <returns>Verification record or null</returns>
    Task<UserVerification?> GetVerificationByIdAsync(int verificationId, string userId);

    /// <summary>
    /// Checks if user can request verification (rate limiting)
    /// </summary>
    /// <param name="userId">ID of the user</param>
    /// <param name="type">Type of verification</param>
    /// <returns>True if user can request, false if rate limited</returns>
    Task<bool> CanRequestVerificationAsync(string userId, VerificationType type);
}