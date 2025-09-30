using System.ComponentModel.DataAnnotations;

namespace API.Models;

/// <summary>
/// Represents a user verification request for different verification types
/// </summary>
public class UserVerification
{
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// The user who submitted the verification request
    /// </summary>
    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Type of verification being requested
    /// </summary>
    [Required]
    public VerificationType Type { get; set; }

    /// <summary>
    /// Current status of the verification request
    /// </summary>
    [Required]
    public VerificationStatus Status { get; set; } = VerificationStatus.Pending;

    /// <summary>
    /// Verification code for email/phone verification (hashed)
    /// </summary>
    public string? VerificationCode { get; set; }

    /// <summary>
    /// Expiration time for verification code
    /// </summary>
    public DateTime? CodeExpiresAt { get; set; }

    /// <summary>
    /// Number of verification attempts made
    /// </summary>
    public int AttemptCount { get; set; } = 0;

    /// <summary>
    /// Last attempt timestamp for rate limiting
    /// </summary>
    public DateTime? LastAttemptAt { get; set; }

    /// <summary>
    /// URLs to uploaded verification documents (JSON array for Identity/Business verification)
    /// </summary>
    public string? DocumentUrls { get; set; }

    /// <summary>
    /// Admin notes for manual review
    /// </summary>
    public string? ReviewNotes { get; set; }

    /// <summary>
    /// Admin who reviewed the verification
    /// </summary>
    public string? ReviewedBy { get; set; }

    /// <summary>
    /// Timestamp when the verification was reviewed
    /// </summary>
    public DateTime? ReviewedAt { get; set; }

    /// <summary>
    /// Timestamp when the verification was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp when the verification was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public ApplicationUser User { get; set; } = null!;
}