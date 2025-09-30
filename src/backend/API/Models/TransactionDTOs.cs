using System.ComponentModel.DataAnnotations;

namespace API.Models;

/// <summary>
/// Request to initialize a payment for an accepted offer
/// </summary>
public class InitializePaymentRequest
{
    [Required]
    public int OfferId { get; set; }

    /// <summary>
    /// Card holder's name
    /// </summary>
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string CardHolderName { get; set; } = string.Empty;

    /// <summary>
    /// Card number (16 digits)
    /// </summary>
    [Required]
    [StringLength(19)]
    [RegularExpression(@"^\d{16}$|^\d{4}\s\d{4}\s\d{4}\s\d{4}$", ErrorMessage = "Invalid card number format")]
    public string CardNumber { get; set; } = string.Empty;

    /// <summary>
    /// Card expiry month (01-12)
    /// </summary>
    [Required]
    [StringLength(2)]
    [RegularExpression(@"^(0[1-9]|1[0-2])$", ErrorMessage = "Invalid expiry month")]
    public string ExpiryMonth { get; set; } = string.Empty;

    /// <summary>
    /// Card expiry year (YY or YYYY)
    /// </summary>
    [Required]
    [StringLength(4)]
    [RegularExpression(@"^\d{2}$|^\d{4}$", ErrorMessage = "Invalid expiry year")]
    public string ExpiryYear { get; set; } = string.Empty;

    /// <summary>
    /// Card CVV (3-4 digits)
    /// </summary>
    [Required]
    [StringLength(4)]
    [RegularExpression(@"^\d{3,4}$", ErrorMessage = "Invalid CVV")]
    public string Cvc { get; set; } = string.Empty;

    /// <summary>
    /// Buyer's billing address
    /// </summary>
    [Required]
    public BillingAddressDto BillingAddress { get; set; } = null!;
}

/// <summary>
/// Billing address information for payment
/// </summary>
public class BillingAddressDto
{
    [Required]
    [StringLength(200)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    public string City { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    public string Country { get; set; } = "Turkey";

    [StringLength(10)]
    public string? ZipCode { get; set; }
}

/// <summary>
/// Response after payment initialization
/// </summary>
public class InitializePaymentResponse
{
    public int TransactionId { get; set; }
    public TransactionStatus Status { get; set; }
    public string? ThreeDSecureHtmlContent { get; set; }
    public string? PaymentUrl { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool Success { get; set; }
}

/// <summary>
/// Payment callback data from payment gateway
/// </summary>
public class PaymentCallbackRequest
{
    public string? Status { get; set; }
    public string? PaymentId { get; set; }
    public string? ConversationId { get; set; }
    public string? Token { get; set; }
}

/// <summary>
/// Transaction details response
/// </summary>
public class TransactionResponse
{
    public int Id { get; set; }
    public int OfferId { get; set; }
    public string OfferTitle { get; set; } = string.Empty;
    public string BuyerId { get; set; } = string.Empty;
    public string BuyerName { get; set; } = string.Empty;
    public string ProviderId { get; set; } = string.Empty;
    public string ProviderName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public TransactionStatus Status { get; set; }
    public PaymentGateway PaymentGateway { get; set; }
    public string? GatewayTransactionId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? ReleasedAt { get; set; }
    public DateTime? RefundedAt { get; set; }
}

/// <summary>
/// Request to release funds to provider
/// </summary>
public class ReleasePaymentRequest
{
    [StringLength(500)]
    public string? Notes { get; set; }
}

/// <summary>
/// Request to refund payment to buyer
/// </summary>
public class RefundPaymentRequest
{
    [Required]
    [StringLength(500)]
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// Transaction filter for listing
/// </summary>
public class TransactionFilterRequest
{
    public string? UserId { get; set; }
    public int? OfferId { get; set; }
    public TransactionStatus? Status { get; set; }
    public PaymentGateway? PaymentGateway { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// Paged result wrapper
/// </summary>
public class PagedTransactionResult
{
    public List<TransactionResponse> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}