using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Interfaces;
using API.Models;

namespace API.Services;

/// <summary>
/// Service for handling user verification requests with rate limiting
/// </summary>
public class VerificationService : IVerificationService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IFileStorageService _fileStorage;
    private readonly ISmsService _smsService;
    private readonly ILogger<VerificationService> _logger;
    private readonly IConfiguration _configuration;

    // Rate limiting constants
    private const int MaxAttemptsInWindow = 3;
    private const int RateLimitWindowMinutes = 5;
    private const int CodeExpirationMinutes = 10;
    private const int CodeLength = 6;

    public VerificationService(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        IFileStorageService fileStorage,
        ISmsService smsService,
        ILogger<VerificationService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _userManager = userManager;
        _fileStorage = fileStorage;
        _smsService = smsService;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<UserVerification> SubmitVerificationRequestAsync(
        string userId,
        VerificationType type,
        List<IFormFile>? documents = null,
        string? notes = null)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                throw new ArgumentException("User not found");
            }

            // Check rate limiting
            if (!await CanRequestVerificationAsync(userId, type))
            {
                throw new InvalidOperationException(
                    $"Rate limit exceeded. Please wait {RateLimitWindowMinutes} minutes before trying again."
                );
            }

            // Check if there's already a pending verification of this type
            var existingVerification = await _context.Set<UserVerification>()
                .FirstOrDefaultAsync(v => v.UserId == userId &&
                                         v.Type == type &&
                                         v.Status == VerificationStatus.Pending);

            if (existingVerification != null)
            {
                throw new InvalidOperationException(
                    $"You already have a pending {type} verification request."
                );
            }

            // Upload documents if provided
            List<string>? documentUrls = null;
            if (documents != null && documents.Count > 0)
            {
                documentUrls = new List<string>();
                foreach (var document in documents)
                {
                    var url = await _fileStorage.UploadImageAsync(document, "verifications");
                    if (!string.IsNullOrEmpty(url))
                    {
                        documentUrls.Add(url);
                    }
                }
            }

            // Create verification record
            var verification = new UserVerification
            {
                UserId = userId,
                Type = type,
                Status = type == VerificationType.Email || type == VerificationType.Phone
                    ? VerificationStatus.Pending
                    : VerificationStatus.InReview, // Identity/Business need manual review
                DocumentUrls = documentUrls != null ? JsonSerializer.Serialize(documentUrls) : null,
                ReviewNotes = notes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Set<UserVerification>().Add(verification);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Verification request submitted: UserId={UserId}, Type={Type}, Id={Id}",
                userId, type, verification.Id
            );

            return verification;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting verification request for user {UserId}", userId);
            throw;
        }
    }

    public async Task<VerificationCodeResponse> SendEmailVerificationCodeAsync(string userId)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return new VerificationCodeResponse
                {
                    Success = false,
                    Message = "User not found"
                };
            }

            if (string.IsNullOrEmpty(user.Email))
            {
                return new VerificationCodeResponse
                {
                    Success = false,
                    Message = "No email address registered"
                };
            }

            // Check rate limiting
            if (!await CanRequestVerificationAsync(userId, VerificationType.Email))
            {
                return new VerificationCodeResponse
                {
                    Success = false,
                    Message = $"Too many attempts. Please wait {RateLimitWindowMinutes} minutes."
                };
            }

            // Generate verification code
            var code = GenerateVerificationCode();
            var hashedCode = HashCode(code);
            var expiresAt = DateTime.UtcNow.AddMinutes(CodeExpirationMinutes);

            // Find or create verification record
            var verification = await _context.Set<UserVerification>()
                .FirstOrDefaultAsync(v => v.UserId == userId && v.Type == VerificationType.Email);

            if (verification == null)
            {
                verification = new UserVerification
                {
                    UserId = userId,
                    Type = VerificationType.Email,
                    Status = VerificationStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Set<UserVerification>().Add(verification);
            }

            verification.VerificationCode = hashedCode;
            verification.CodeExpiresAt = expiresAt;
            verification.LastAttemptAt = DateTime.UtcNow;
            verification.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Send email using Identity's email sender (if configured)
            // For now, log the code (in production, send via SMTP)
            _logger.LogWarning(
                "EMAIL VERIFICATION CODE - User: {Email}, Code: {Code} (Expires: {Expires})",
                user.Email, code, expiresAt
            );

            // TODO: Integrate with actual email service
            // await _emailService.SendVerificationCodeAsync(user.Email, code);

            return new VerificationCodeResponse
            {
                Success = true,
                Message = "Verification code sent to your email",
                ExpiresAt = expiresAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email verification code for user {UserId}", userId);
            return new VerificationCodeResponse
            {
                Success = false,
                Message = "Failed to send verification code"
            };
        }
    }

    public async Task<VerificationCodeResponse> SendPhoneVerificationCodeAsync(string userId)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return new VerificationCodeResponse
                {
                    Success = false,
                    Message = "User not found"
                };
            }

            if (string.IsNullOrEmpty(user.PhoneNumber))
            {
                return new VerificationCodeResponse
                {
                    Success = false,
                    Message = "No phone number registered"
                };
            }

            // Check rate limiting
            if (!await CanRequestVerificationAsync(userId, VerificationType.Phone))
            {
                return new VerificationCodeResponse
                {
                    Success = false,
                    Message = $"Too many attempts. Please wait {RateLimitWindowMinutes} minutes."
                };
            }

            // Generate verification code
            var code = GenerateVerificationCode();
            var hashedCode = HashCode(code);
            var expiresAt = DateTime.UtcNow.AddMinutes(CodeExpirationMinutes);

            // Find or create verification record
            var verification = await _context.Set<UserVerification>()
                .FirstOrDefaultAsync(v => v.UserId == userId && v.Type == VerificationType.Phone);

            if (verification == null)
            {
                verification = new UserVerification
                {
                    UserId = userId,
                    Type = VerificationType.Phone,
                    Status = VerificationStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Set<UserVerification>().Add(verification);
            }

            verification.VerificationCode = hashedCode;
            verification.CodeExpiresAt = expiresAt;
            verification.LastAttemptAt = DateTime.UtcNow;
            verification.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Send SMS
            var smsSent = await _smsService.SendVerificationCodeAsync(user.PhoneNumber, code);

            if (!smsSent)
            {
                _logger.LogWarning("Failed to send SMS to {PhoneNumber}", user.PhoneNumber);
            }

            return new VerificationCodeResponse
            {
                Success = true,
                Message = "Verification code sent to your phone",
                ExpiresAt = expiresAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending phone verification code for user {UserId}", userId);
            return new VerificationCodeResponse
            {
                Success = false,
                Message = "Failed to send verification code"
            };
        }
    }

    public async Task<VerificationResultResponse> VerifyEmailCodeAsync(
        string userId,
        string email,
        string code)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || user.Email?.ToLower() != email.ToLower())
            {
                return new VerificationResultResponse
                {
                    Success = false,
                    Message = "Invalid user or email"
                };
            }

            var verification = await _context.Set<UserVerification>()
                .FirstOrDefaultAsync(v => v.UserId == userId && v.Type == VerificationType.Email);

            if (verification == null)
            {
                return new VerificationResultResponse
                {
                    Success = false,
                    Message = "No verification request found"
                };
            }

            // Check if code is expired
            if (verification.CodeExpiresAt == null || verification.CodeExpiresAt < DateTime.UtcNow)
            {
                return new VerificationResultResponse
                {
                    Success = false,
                    Message = "Verification code has expired"
                };
            }

            // Check if code matches
            var hashedCode = HashCode(code);
            if (verification.VerificationCode != hashedCode)
            {
                // Increment attempt count
                verification.AttemptCount++;
                verification.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return new VerificationResultResponse
                {
                    Success = false,
                    Message = "Invalid verification code"
                };
            }

            // Mark as approved
            verification.Status = VerificationStatus.Approved;
            verification.UpdatedAt = DateTime.UtcNow;
            verification.ReviewedAt = DateTime.UtcNow;

            // Update user badges
            user.VerificationBadges |= VerificationBadges.EmailVerified;
            user.EmailConfirmed = true;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Email verified successfully for user {UserId}", userId);

            return new VerificationResultResponse
            {
                Success = true,
                Message = "Email verified successfully",
                UpdatedBadges = user.VerificationBadges
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying email code for user {UserId}", userId);
            return new VerificationResultResponse
            {
                Success = false,
                Message = "Verification failed"
            };
        }
    }

    public async Task<VerificationResultResponse> VerifyPhoneCodeAsync(
        string userId,
        string phoneNumber,
        string code)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || user.PhoneNumber != phoneNumber)
            {
                return new VerificationResultResponse
                {
                    Success = false,
                    Message = "Invalid user or phone number"
                };
            }

            var verification = await _context.Set<UserVerification>()
                .FirstOrDefaultAsync(v => v.UserId == userId && v.Type == VerificationType.Phone);

            if (verification == null)
            {
                return new VerificationResultResponse
                {
                    Success = false,
                    Message = "No verification request found"
                };
            }

            // Check if code is expired
            if (verification.CodeExpiresAt == null || verification.CodeExpiresAt < DateTime.UtcNow)
            {
                return new VerificationResultResponse
                {
                    Success = false,
                    Message = "Verification code has expired"
                };
            }

            // Check if code matches
            var hashedCode = HashCode(code);
            if (verification.VerificationCode != hashedCode)
            {
                // Increment attempt count
                verification.AttemptCount++;
                verification.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return new VerificationResultResponse
                {
                    Success = false,
                    Message = "Invalid verification code"
                };
            }

            // Mark as approved
            verification.Status = VerificationStatus.Approved;
            verification.UpdatedAt = DateTime.UtcNow;
            verification.ReviewedAt = DateTime.UtcNow;

            // Update user badges
            user.VerificationBadges |= VerificationBadges.PhoneVerified;
            user.PhoneNumberConfirmed = true;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Phone verified successfully for user {UserId}", userId);

            return new VerificationResultResponse
            {
                Success = true,
                Message = "Phone number verified successfully",
                UpdatedBadges = user.VerificationBadges
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying phone code for user {UserId}", userId);
            return new VerificationResultResponse
            {
                Success = false,
                Message = "Verification failed"
            };
        }
    }

    public async Task<UserVerificationsResponse> GetUserVerificationsAsync(string userId)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                throw new ArgumentException("User not found");
            }

            var verificationsData = await _context.Set<UserVerification>()
                .Where(v => v.UserId == userId)
                .OrderByDescending(v => v.CreatedAt)
                .ToListAsync();

            var verifications = verificationsData.Select(v => new VerificationStatusResponse
            {
                Id = v.Id,
                Type = v.Type,
                Status = v.Status,
                DocumentUrls = !string.IsNullOrEmpty(v.DocumentUrls)
                    ? JsonSerializer.Deserialize<List<string>>(v.DocumentUrls)
                    : null,
                ReviewNotes = v.ReviewNotes,
                CreatedAt = v.CreatedAt,
                ReviewedAt = v.ReviewedAt
            }).ToList();

            return new UserVerificationsResponse
            {
                Badges = user.VerificationBadges,
                Verifications = verifications
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting verifications for user {UserId}", userId);
            throw;
        }
    }

    public async Task<UserVerification?> GetVerificationByIdAsync(int verificationId, string userId)
    {
        try
        {
            return await _context.Set<UserVerification>()
                .FirstOrDefaultAsync(v => v.Id == verificationId && v.UserId == userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting verification {VerificationId}", verificationId);
            return null;
        }
    }

    public async Task<bool> CanRequestVerificationAsync(string userId, VerificationType type)
    {
        try
        {
            var windowStart = DateTime.UtcNow.AddMinutes(-RateLimitWindowMinutes);

            var recentAttempts = await _context.Set<UserVerification>()
                .Where(v => v.UserId == userId &&
                           v.Type == type &&
                           v.LastAttemptAt != null &&
                           v.LastAttemptAt >= windowStart)
                .CountAsync();

            var canRequest = recentAttempts < MaxAttemptsInWindow;

            if (!canRequest)
            {
                _logger.LogWarning(
                    "Rate limit exceeded for user {UserId}, type {Type}. Attempts: {Attempts}",
                    userId, type, recentAttempts
                );
            }

            return canRequest;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking rate limit for user {UserId}", userId);
            return false;
        }
    }

    #region Private Helper Methods

    /// <summary>
    /// Generates a random 6-digit verification code
    /// </summary>
    private string GenerateVerificationCode()
    {
        var random = RandomNumberGenerator.GetInt32(100000, 999999);
        return random.ToString();
    }

    /// <summary>
    /// Hashes a verification code using SHA256
    /// </summary>
    private string HashCode(string code)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(code);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    #endregion
}