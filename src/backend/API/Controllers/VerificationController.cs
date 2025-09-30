using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using API.Interfaces;
using API.Models;

namespace API.Controllers;

/// <summary>
/// Controller for handling user verification requests
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VerificationController : ControllerBase
{
    private readonly IVerificationService _verificationService;
    private readonly ILogger<VerificationController> _logger;

    public VerificationController(
        IVerificationService verificationService,
        ILogger<VerificationController> logger)
    {
        _verificationService = verificationService;
        _logger = logger;
    }

    /// <summary>
    /// Submit a verification request with optional documents
    /// </summary>
    /// <param name="request">Verification request with type and documents</param>
    /// <returns>Created verification record</returns>
    /// <response code="201">Verification request submitted successfully</response>
    /// <response code="400">Invalid request or rate limit exceeded</response>
    /// <response code="401">User not authenticated</response>
    [HttpPost("submit")]
    [ProducesResponseType(typeof(VerificationStatusResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SubmitVerification([FromForm] SubmitVerificationRequest request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            // Validate that documents are provided for Identity/Business verification
            if ((request.Type == VerificationType.Identity || request.Type == VerificationType.Business) &&
                (request.Documents == null || request.Documents.Count == 0))
            {
                return BadRequest(new
                {
                    message = $"{request.Type} verification requires document uploads"
                });
            }

            var verification = await _verificationService.SubmitVerificationRequestAsync(
                userId,
                request.Type,
                request.Documents,
                request.Notes
            );

            var response = new VerificationStatusResponse
            {
                Id = verification.Id,
                Type = verification.Type,
                Status = verification.Status,
                DocumentUrls = !string.IsNullOrEmpty(verification.DocumentUrls)
                    ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(verification.DocumentUrls)
                    : null,
                ReviewNotes = verification.ReviewNotes,
                CreatedAt = verification.CreatedAt,
                ReviewedAt = verification.ReviewedAt
            };

            _logger.LogInformation(
                "Verification submitted: UserId={UserId}, Type={Type}, Id={Id}",
                userId, request.Type, verification.Id
            );

            return CreatedAtAction(
                nameof(GetVerificationStatus),
                new { verificationId = verification.Id },
                response
            );
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid verification request");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting verification");
            return StatusCode(500, new { message = "An error occurred while submitting verification" });
        }
    }

    /// <summary>
    /// Send email verification code
    /// </summary>
    /// <returns>Response indicating if code was sent</returns>
    /// <response code="200">Verification code sent successfully</response>
    /// <response code="400">Failed to send verification code or rate limit exceeded</response>
    /// <response code="401">User not authenticated</response>
    [HttpGet("verify-email")]
    [ProducesResponseType(typeof(VerificationCodeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SendEmailVerificationCode()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var response = await _verificationService.SendEmailVerificationCodeAsync(userId);

            if (!response.Success)
            {
                return BadRequest(response);
            }

            _logger.LogInformation("Email verification code sent to user {UserId}", userId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending email verification code");
            return StatusCode(500, new { message = "An error occurred while sending verification code" });
        }
    }

    /// <summary>
    /// Verify email with provided code
    /// </summary>
    /// <param name="request">Email and verification code</param>
    /// <returns>Verification result</returns>
    /// <response code="200">Email verified successfully</response>
    /// <response code="400">Invalid code or verification failed</response>
    /// <response code="401">User not authenticated</response>
    [HttpPost("verify-email")]
    [ProducesResponseType(typeof(VerificationResultResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> VerifyEmailCode([FromBody] VerifyEmailRequest request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var response = await _verificationService.VerifyEmailCodeAsync(
                userId,
                request.Email,
                request.Code
            );

            if (!response.Success)
            {
                return BadRequest(response);
            }

            _logger.LogInformation("Email verified for user {UserId}", userId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying email code");
            return StatusCode(500, new { message = "An error occurred during verification" });
        }
    }

    /// <summary>
    /// Send phone verification code via SMS
    /// </summary>
    /// <returns>Response indicating if code was sent</returns>
    /// <response code="200">Verification code sent successfully</response>
    /// <response code="400">Failed to send verification code or rate limit exceeded</response>
    /// <response code="401">User not authenticated</response>
    [HttpGet("verify-phone")]
    [ProducesResponseType(typeof(VerificationCodeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SendPhoneVerificationCode()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var response = await _verificationService.SendPhoneVerificationCodeAsync(userId);

            if (!response.Success)
            {
                return BadRequest(response);
            }

            _logger.LogInformation("Phone verification code sent to user {UserId}", userId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending phone verification code");
            return StatusCode(500, new { message = "An error occurred while sending verification code" });
        }
    }

    /// <summary>
    /// Verify phone with provided code
    /// </summary>
    /// <param name="request">Phone number and verification code</param>
    /// <returns>Verification result</returns>
    /// <response code="200">Phone verified successfully</response>
    /// <response code="400">Invalid code or verification failed</response>
    /// <response code="401">User not authenticated</response>
    [HttpPost("verify-phone")]
    [ProducesResponseType(typeof(VerificationResultResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> VerifyPhoneCode([FromBody] VerifyPhoneRequest request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var response = await _verificationService.VerifyPhoneCodeAsync(
                userId,
                request.PhoneNumber,
                request.Code
            );

            if (!response.Success)
            {
                return BadRequest(response);
            }

            _logger.LogInformation("Phone verified for user {UserId}", userId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying phone code");
            return StatusCode(500, new { message = "An error occurred during verification" });
        }
    }

    /// <summary>
    /// Get user's verification status and badges
    /// </summary>
    /// <returns>User verifications with badges</returns>
    /// <response code="200">Verification status retrieved successfully</response>
    /// <response code="401">User not authenticated</response>
    [HttpGet("status")]
    [ProducesResponseType(typeof(UserVerificationsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetVerificationStatus()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var response = await _verificationService.GetUserVerificationsAsync(userId);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting verification status");
            return StatusCode(500, new { message = "An error occurred while retrieving verification status" });
        }
    }

    /// <summary>
    /// Get a specific verification record by ID
    /// </summary>
    /// <param name="verificationId">ID of the verification</param>
    /// <returns>Verification details</returns>
    /// <response code="200">Verification details retrieved successfully</response>
    /// <response code="404">Verification not found</response>
    /// <response code="401">User not authenticated</response>
    [HttpGet("{verificationId}")]
    [ProducesResponseType(typeof(VerificationStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetVerificationById(int verificationId)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var verification = await _verificationService.GetVerificationByIdAsync(verificationId, userId);

            if (verification == null)
            {
                return NotFound(new { message = "Verification not found" });
            }

            var response = new VerificationStatusResponse
            {
                Id = verification.Id,
                Type = verification.Type,
                Status = verification.Status,
                DocumentUrls = !string.IsNullOrEmpty(verification.DocumentUrls)
                    ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(verification.DocumentUrls)
                    : null,
                ReviewNotes = verification.ReviewNotes,
                CreatedAt = verification.CreatedAt,
                ReviewedAt = verification.ReviewedAt
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting verification {VerificationId}", verificationId);
            return StatusCode(500, new { message = "An error occurred while retrieving verification" });
        }
    }
}