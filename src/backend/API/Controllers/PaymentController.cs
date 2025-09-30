using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using API.Interfaces;
using API.Models;
using API.Middleware;

namespace API.Controllers;

/// <summary>
/// Payment operations controller
/// Handles payment initialization, callbacks, escrow, and refunds
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(IPaymentService paymentService, ILogger<PaymentController> logger)
    {
        _paymentService = paymentService;
        _logger = logger;
    }

    /// <summary>
    /// Initialize payment for an accepted offer
    /// Creates transaction and returns 3D Secure form or payment URL
    /// </summary>
    [HttpPost("initialize")]
    [Authorize]
    public async Task<ActionResult<InitializePaymentResponse>> InitializePayment([FromBody] InitializePaymentRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var response = await _paymentService.InitializePaymentAsync(request, userId);
            return Ok(response);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message, errors = ex.Errors });
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing payment");
            return StatusCode(500, new { message = "Ödeme başlatılırken hata oluştu." });
        }
    }

    /// <summary>
    /// Handle payment callback from Iyzico
    /// Called by Iyzico after 3D Secure completion
    /// </summary>
    [HttpPost("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> PaymentCallback([FromForm] PaymentCallbackRequest request)
    {
        try
        {
            var transaction = await _paymentService.HandlePaymentCallbackAsync(request);

            if (transaction.Status == TransactionStatus.Completed)
            {
                // Redirect to success page
                return Redirect($"/payment/success?transactionId={transaction.Id}");
            }
            else
            {
                // Redirect to failure page
                return Redirect($"/payment/failure?transactionId={transaction.Id}&error={transaction.ErrorMessage}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling payment callback");
            return Redirect("/payment/failure?error=Callback processing failed");
        }
    }

    /// <summary>
    /// Get transaction details by ID
    /// </summary>
    [HttpGet("{transactionId}")]
    [Authorize]
    public async Task<ActionResult<TransactionResponse>> GetTransaction(int transactionId)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var transaction = await _paymentService.GetTransactionByIdAsync(transactionId, userId);
            if (transaction == null)
            {
                return NotFound("İşlem bulunamadı.");
            }

            return Ok(transaction);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transaction {TransactionId}", transactionId);
            return StatusCode(500, new { message = "İşlem bilgileri alınırken hata oluştu." });
        }
    }

    /// <summary>
    /// Get transaction by offer ID
    /// </summary>
    [HttpGet("offer/{offerId}")]
    [Authorize]
    public async Task<ActionResult<TransactionResponse>> GetTransactionByOffer(int offerId)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var transaction = await _paymentService.GetTransactionByOfferIdAsync(offerId, userId);
            if (transaction == null)
            {
                return NotFound("Bu teklif için işlem bulunamadı.");
            }

            return Ok(transaction);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transaction for offer {OfferId}", offerId);
            return StatusCode(500, new { message = "İşlem bilgileri alınırken hata oluştu." });
        }
    }

    /// <summary>
    /// Get user's transactions
    /// Returns transactions where user is buyer or provider
    /// </summary>
    [HttpGet("my-transactions")]
    [Authorize]
    public async Task<ActionResult<PagedTransactionResult>> GetMyTransactions([FromQuery] TransactionFilterRequest filter)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var result = await _paymentService.GetUserTransactionsAsync(userId, filter);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user transactions");
            return StatusCode(500, new { message = "İşlemler alınırken hata oluştu." });
        }
    }

    /// <summary>
    /// Release payment from escrow to provider
    /// Called by buyer after service completion
    /// </summary>
    [HttpPost("release/{transactionId}")]
    [Authorize]
    public async Task<ActionResult<TransactionResponse>> ReleasePayment(
        int transactionId,
        [FromBody] ReleasePaymentRequest? request = null)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var transaction = await _paymentService.ReleasePaymentAsync(transactionId, userId, request);
            return Ok(transaction);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message, errors = ex.Errors });
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error releasing payment for transaction {TransactionId}", transactionId);
            return StatusCode(500, new { message = "Ödeme serbest bırakılırken hata oluştu." });
        }
    }

    /// <summary>
    /// Refund payment to buyer
    /// Can be called by buyer or provider with reason
    /// </summary>
    [HttpPost("refund/{transactionId}")]
    [Authorize]
    public async Task<ActionResult<TransactionResponse>> RefundPayment(
        int transactionId,
        [FromBody] RefundPaymentRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var transaction = await _paymentService.RefundPaymentAsync(transactionId, userId, request);
            return Ok(transaction);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message, errors = ex.Errors });
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedException ex)
        {
            return Unauthorized(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refunding payment for transaction {TransactionId}", transactionId);
            return StatusCode(500, new { message = "Ödeme iade edilirken hata oluştu." });
        }
    }

    /// <summary>
    /// Get transaction statistics for current user
    /// </summary>
    [HttpGet("stats")]
    [Authorize]
    public async Task<ActionResult<TransactionStatsResponse>> GetTransactionStats()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var stats = await _paymentService.GetUserTransactionStatsAsync(userId);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transaction stats");
            return StatusCode(500, new { message = "İstatistikler alınırken hata oluştu." });
        }
    }

    /// <summary>
    /// Check if user can access a transaction
    /// </summary>
    [HttpGet("{transactionId}/access")]
    [Authorize]
    public async Task<ActionResult<bool>> CanAccessTransaction(int transactionId)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var canAccess = await _paymentService.CanUserAccessTransactionAsync(transactionId, userId);
            return Ok(canAccess);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking transaction access");
            return StatusCode(500, new { message = "Erişim kontrolü yapılırken hata oluştu." });
        }
    }
}