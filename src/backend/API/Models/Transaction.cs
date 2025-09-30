namespace API.Models;

/// <summary>
/// Represents a payment transaction in the system
/// Implements escrow functionality: payment held until service completion
/// </summary>
public class Transaction
{
    public int Id { get; set; }

    /// <summary>
    /// The offer being paid for
    /// </summary>
    public int OfferId { get; set; }

    /// <summary>
    /// The buyer who is making the payment
    /// </summary>
    public string BuyerId { get; set; } = string.Empty;

    /// <summary>
    /// The provider who will receive the payment after service completion
    /// </summary>
    public string ProviderId { get; set; } = string.Empty;

    /// <summary>
    /// Transaction amount
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Currency code (TRY, USD, EUR, etc.)
    /// </summary>
    public string Currency { get; set; } = "TRY";

    /// <summary>
    /// Current status of the transaction
    /// </summary>
    public TransactionStatus Status { get; set; } = TransactionStatus.Pending;

    /// <summary>
    /// Payment gateway used (Iyzico, PayTR, etc.)
    /// </summary>
    public PaymentGateway PaymentGateway { get; set; } = PaymentGateway.Iyzico;

    /// <summary>
    /// External payment gateway transaction ID
    /// </summary>
    public string? GatewayTransactionId { get; set; }

    /// <summary>
    /// Payment token for 3D Secure flow
    /// </summary>
    public string? PaymentToken { get; set; }

    /// <summary>
    /// 3D Secure HTML content for payment page
    /// </summary>
    public string? ThreeDSecureHtmlContent { get; set; }

    /// <summary>
    /// Conversation ID for tracking in payment gateway
    /// </summary>
    public string? ConversationId { get; set; }

    /// <summary>
    /// Error message if payment failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Additional metadata in JSON format
    /// </summary>
    public string? Metadata { get; set; }

    /// <summary>
    /// Timestamp when transaction was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp when transaction was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp when payment was completed (funds in escrow)
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Timestamp when funds were released to provider
    /// </summary>
    public DateTime? ReleasedAt { get; set; }

    /// <summary>
    /// Timestamp when payment was refunded
    /// </summary>
    public DateTime? RefundedAt { get; set; }

    // Navigation Properties
    public Offer Offer { get; set; } = null!;
    public ApplicationUser Buyer { get; set; } = null!;
    public ApplicationUser Provider { get; set; } = null!;
}