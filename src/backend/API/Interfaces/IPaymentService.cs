using API.Models;

namespace API.Interfaces;

/// <summary>
/// Service interface for payment gateway operations
/// Handles payment initialization, processing, escrow, and refunds
/// </summary>
public interface IPaymentService
{
    /// <summary>
    /// Initialize payment for an accepted offer
    /// Creates transaction and initiates payment with gateway (3D Secure)
    /// </summary>
    Task<InitializePaymentResponse> InitializePaymentAsync(InitializePaymentRequest request, string buyerId);

    /// <summary>
    /// Handle payment callback from payment gateway
    /// Updates transaction status based on payment result
    /// </summary>
    Task<TransactionResponse> HandlePaymentCallbackAsync(PaymentCallbackRequest request);

    /// <summary>
    /// Get transaction by ID
    /// </summary>
    Task<TransactionResponse?> GetTransactionByIdAsync(int transactionId, string? userId = null);

    /// <summary>
    /// Get transaction by offer ID
    /// </summary>
    Task<TransactionResponse?> GetTransactionByOfferIdAsync(int offerId, string? userId = null);

    /// <summary>
    /// Get user's transactions (buyer or provider)
    /// </summary>
    Task<PagedTransactionResult> GetUserTransactionsAsync(string userId, TransactionFilterRequest filter);

    /// <summary>
    /// Release payment from escrow to provider
    /// Called when buyer confirms service completion
    /// </summary>
    Task<TransactionResponse> ReleasePaymentAsync(int transactionId, string buyerId, ReleasePaymentRequest? request = null);

    /// <summary>
    /// Refund payment to buyer
    /// Called when service is not delivered or buyer is not satisfied
    /// </summary>
    Task<TransactionResponse> RefundPaymentAsync(int transactionId, string userId, RefundPaymentRequest request);

    /// <summary>
    /// Check if user can access transaction
    /// </summary>
    Task<bool> CanUserAccessTransactionAsync(int transactionId, string userId);

    /// <summary>
    /// Get transaction statistics for user
    /// </summary>
    Task<TransactionStatsResponse> GetUserTransactionStatsAsync(string userId);
}

/// <summary>
/// Transaction statistics response
/// </summary>
public class TransactionStatsResponse
{
    public int TotalTransactions { get; set; }
    public int CompletedTransactions { get; set; }
    public int PendingTransactions { get; set; }
    public int RefundedTransactions { get; set; }
    public decimal TotalSpent { get; set; }
    public decimal TotalEarned { get; set; }
    public string Currency { get; set; } = "TRY";
}