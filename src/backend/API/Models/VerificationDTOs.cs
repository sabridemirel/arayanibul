using System.ComponentModel.DataAnnotations;

namespace API.Models;

/// <summary>
/// Request to submit a verification with documents
/// </summary>
public class SubmitVerificationRequest
{
    [Required]
    public VerificationType Type { get; set; }

    /// <summary>
    /// Document files for Identity/Business verification
    /// </summary>
    public List<IFormFile>? Documents { get; set; }

    /// <summary>
    /// Additional notes or information
    /// </summary>
    public string? Notes { get; set; }
}

/// <summary>
/// Request to verify email code
/// </summary>
public class VerifyEmailRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string Code { get; set; } = string.Empty;
}

/// <summary>
/// Request to verify phone code
/// </summary>
public class VerifyPhoneRequest
{
    [Required]
    [Phone]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string Code { get; set; } = string.Empty;
}

/// <summary>
/// Response for verification status
/// </summary>
public class VerificationStatusResponse
{
    public int Id { get; set; }
    public VerificationType Type { get; set; }
    public VerificationStatus Status { get; set; }
    public List<string>? DocumentUrls { get; set; }
    public string? ReviewNotes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
}

/// <summary>
/// Response for all user verifications
/// </summary>
public class UserVerificationsResponse
{
    public VerificationBadges Badges { get; set; }
    public List<VerificationStatusResponse> Verifications { get; set; } = new();
}

/// <summary>
/// Response for verification code sent
/// </summary>
public class VerificationCodeResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
}

/// <summary>
/// Response for verification result
/// </summary>
public class VerificationResultResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public VerificationBadges? UpdatedBadges { get; set; }
}