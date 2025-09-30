using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Iyzipay;
using Iyzipay.Model;
using Iyzipay.Request;
using API.Data;
using API.Interfaces;
using API.Models;
using API.Middleware;
using ThreedsInitializeResponse = Iyzipay.Model.ThreedsInitialize;
using PaymentResponse = Iyzipay.Model.Payment;

namespace API.Services;

/// <summary>
/// Payment service implementation using Iyzico payment gateway
/// Handles payment initialization, processing, escrow, and refunds
/// </summary>
public class PaymentService : IPaymentService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly INotificationService _notificationService;
    private readonly ILogger<PaymentService> _logger;
    private readonly Options _iyzicoOptions;

    public PaymentService(
        ApplicationDbContext context,
        IConfiguration configuration,
        INotificationService notificationService,
        ILogger<PaymentService> logger)
    {
        _context = context;
        _configuration = configuration;
        _notificationService = notificationService;
        _logger = logger;

        // Initialize Iyzico options
        _iyzicoOptions = new Options
        {
            ApiKey = _configuration["PaymentGateway:Iyzico:ApiKey"] ?? "sandbox-apikey",
            SecretKey = _configuration["PaymentGateway:Iyzico:SecretKey"] ?? "sandbox-secretkey",
            BaseUrl = _configuration["PaymentGateway:Iyzico:BaseUrl"] ?? "https://sandbox-api.iyzipay.com"
        };
    }

    public async Task<InitializePaymentResponse> InitializePaymentAsync(InitializePaymentRequest request, string buyerId)
    {
        try
        {
            // Validate offer exists and is accepted
            var offer = await _context.Offers
                .Include(o => o.Need)
                .ThenInclude(n => n.User)
                .Include(o => o.Provider)
                .FirstOrDefaultAsync(o => o.Id == request.OfferId);

            if (offer == null)
            {
                throw new NotFoundException("Teklif bulunamadı.");
            }

            if (offer.Status != OfferStatus.Accepted)
            {
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    { "OfferId", new[] { "Sadece kabul edilmiş teklifler için ödeme yapılabilir." } }
                });
            }

            // Validate buyer is the need owner
            if (offer.Need.UserId != buyerId)
            {
                throw new UnauthorizedException("Bu teklif için ödeme yapma yetkiniz yok.");
            }

            // Check if payment already exists for this offer
            var existingTransaction = await _context.Transactions
                .FirstOrDefaultAsync(t => t.OfferId == request.OfferId &&
                                         (t.Status == TransactionStatus.Completed ||
                                          t.Status == TransactionStatus.Pending ||
                                          t.Status == TransactionStatus.Processing));

            if (existingTransaction != null)
            {
                throw new ValidationException(new Dictionary<string, string[]>
                {
                    { "OfferId", new[] { "Bu teklif için zaten aktif bir ödeme bulunmaktadır." } }
                });
            }

            // Create transaction record
            var transaction = new Transaction
            {
                OfferId = offer.Id,
                BuyerId = buyerId,
                ProviderId = offer.ProviderId,
                Amount = offer.Price,
                Currency = offer.Currency,
                Status = TransactionStatus.Pending,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            // Initialize Iyzico payment
            var buyer = await _context.Users.FindAsync(buyerId);
            if (buyer == null)
            {
                throw new NotFoundException("Alıcı bulunamadı.");
            }

            var paymentRequest = new CreatePaymentRequest
            {
                Locale = Locale.TR.ToString(),
                ConversationId = transaction.ConversationId,
                Price = offer.Price.ToString("F2", System.Globalization.CultureInfo.InvariantCulture),
                PaidPrice = offer.Price.ToString("F2", System.Globalization.CultureInfo.InvariantCulture),
                Currency = offer.Currency == "TRY" ? Currency.TRY.ToString() : Currency.USD.ToString(),
                Installment = 1,
                BasketId = $"B{offer.Id}",
                PaymentChannel = PaymentChannel.WEB.ToString(),
                PaymentGroup = PaymentGroup.PRODUCT.ToString(),
                CallbackUrl = $"{_configuration["PaymentGateway:CallbackUrl"]}/api/payment/callback"
            };

            // Payment card
            var paymentCard = new PaymentCard
            {
                CardHolderName = request.CardHolderName,
                CardNumber = request.CardNumber.Replace(" ", ""),
                ExpireMonth = request.ExpiryMonth,
                ExpireYear = request.ExpiryYear,
                Cvc = request.Cvc,
                RegisterCard = 0
            };
            paymentRequest.PaymentCard = paymentCard;

            // Buyer info
            var buyerInfo = new Buyer
            {
                Id = buyerId,
                Name = buyer.FirstName,
                Surname = buyer.LastName,
                GsmNumber = buyer.PhoneNumber ?? "+905555555555",
                Email = buyer.Email ?? "buyer@arayanibul.com",
                IdentityNumber = "11111111111", // Would come from verification system
                RegistrationAddress = request.BillingAddress.Address,
                Ip = "85.34.78.112", // Should be actual IP
                City = request.BillingAddress.City,
                Country = request.BillingAddress.Country
            };
            paymentRequest.Buyer = buyerInfo;

            // Shipping and billing address
            var shippingAddress = new Iyzipay.Model.Address
            {
                ContactName = $"{buyer.FirstName} {buyer.LastName}",
                City = request.BillingAddress.City,
                Country = request.BillingAddress.Country,
                Description = request.BillingAddress.Address,
                ZipCode = request.BillingAddress.ZipCode
            };
            paymentRequest.ShippingAddress = shippingAddress;
            paymentRequest.BillingAddress = shippingAddress;

            // Basket items
            var basketItems = new List<BasketItem>
            {
                new BasketItem
                {
                    Id = offer.Id.ToString(),
                    Name = offer.Need.Title.Length > 50 ? offer.Need.Title.Substring(0, 50) : offer.Need.Title,
                    Category1 = "Service",
                    ItemType = BasketItemType.VIRTUAL.ToString(),
                    Price = offer.Price.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)
                }
            };
            paymentRequest.BasketItems = basketItems;

            // Create payment with 3D Secure (Iyzipay SDK returns Task)
            var iyziPayment = await Task.Run(() => ThreedsInitialize.Create(paymentRequest, _iyzicoOptions));

            // Check if payment initialization was successful
            if (iyziPayment != null && iyziPayment.Status == "success" && !string.IsNullOrEmpty(iyziPayment.HtmlContent))
            {
                // Update transaction with payment info - store the payment token if available
                transaction.PaymentToken = iyziPayment.PaymentId ?? Guid.NewGuid().ToString();
                transaction.ThreeDSecureHtmlContent = iyziPayment.HtmlContent;
                transaction.Status = TransactionStatus.Processing;
                transaction.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return new InitializePaymentResponse
                {
                    TransactionId = transaction.Id,
                    Status = TransactionStatus.Processing,
                    ThreeDSecureHtmlContent = iyziPayment.HtmlContent,
                    PaymentUrl = null, // HTML content is used for 3D Secure
                    Success = true,
                    Message = "Ödeme başlatıldı. 3D Secure doğrulamasına yönlendiriliyorsunuz."
                };
            }
            else
            {
                // Payment initialization failed
                transaction.Status = TransactionStatus.Failed;
                transaction.ErrorMessage = iyziPayment?.ErrorMessage ?? "Ödeme başlatılamadı.";
                transaction.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return new InitializePaymentResponse
                {
                    TransactionId = transaction.Id,
                    Status = TransactionStatus.Failed,
                    Success = false,
                    Message = iyziPayment?.ErrorMessage ?? "Ödeme başlatılamadı."
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing payment for offer {OfferId}", request.OfferId);
            throw;
        }
    }

    public async Task<TransactionResponse> HandlePaymentCallbackAsync(PaymentCallbackRequest request)
    {
        try
        {
            // Find transaction by conversation ID
            var transaction = await _context.Transactions
                .Include(t => t.Offer)
                .ThenInclude(o => o.Need)
                .Include(t => t.Buyer)
                .Include(t => t.Provider)
                .FirstOrDefaultAsync(t => t.ConversationId == request.ConversationId);

            if (transaction == null)
            {
                throw new NotFoundException("İşlem bulunamadı.");
            }

            // Retrieve payment result from Iyzico
            var retrieveRequest = new RetrievePaymentRequest
            {
                ConversationId = request.ConversationId,
                PaymentId = request.PaymentId
            };

            var iyziPayment = await Task.Run(() => Payment.Retrieve(retrieveRequest, _iyzicoOptions));

            if (iyziPayment != null && iyziPayment.Status == "success")
            {
                // Payment successful - update transaction
                transaction.Status = TransactionStatus.Completed;
                transaction.GatewayTransactionId = iyziPayment.PaymentId;
                transaction.CompletedAt = DateTime.UtcNow;
                transaction.UpdatedAt = DateTime.UtcNow;

                // Update need status
                var need = transaction.Offer.Need;
                if (need.Status == NeedStatus.InProgress)
                {
                    // Status remains InProgress until service is delivered
                }

                await _context.SaveChangesAsync();

                // Notify both parties
                await _notificationService.SendPushNotificationAsync(
                    transaction.BuyerId,
                    "Ödeme Başarılı",
                    $"'{transaction.Offer.Need.Title}' için ödemeniz başarıyla tamamlandı.",
                    new { type = "payment", transactionId = transaction.Id }
                );

                await _notificationService.SendPushNotificationAsync(
                    transaction.ProviderId,
                    "Ödeme Alındı",
                    $"'{transaction.Offer.Need.Title}' için ödeme alındı. Hizmeti tamamlayın.",
                    new { type = "payment", transactionId = transaction.Id }
                );

                return MapToTransactionResponse(transaction);
            }
            else
            {
                // Payment failed
                transaction.Status = TransactionStatus.Failed;
                transaction.ErrorMessage = iyziPayment?.ErrorMessage ?? "Ödeme başarısız oldu.";
                transaction.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return MapToTransactionResponse(transaction);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling payment callback");
            throw;
        }
    }

    public async Task<TransactionResponse?> GetTransactionByIdAsync(int transactionId, string? userId = null)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Offer)
            .ThenInclude(o => o.Need)
            .Include(t => t.Buyer)
            .Include(t => t.Provider)
            .FirstOrDefaultAsync(t => t.Id == transactionId);

        if (transaction == null)
        {
            return null;
        }

        // Check access permissions
        if (userId != null && !await CanUserAccessTransactionAsync(transactionId, userId))
        {
            throw new UnauthorizedException("Bu işleme erişim yetkiniz yok.");
        }

        return MapToTransactionResponse(transaction);
    }

    public async Task<TransactionResponse?> GetTransactionByOfferIdAsync(int offerId, string? userId = null)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Offer)
            .ThenInclude(o => o.Need)
            .Include(t => t.Buyer)
            .Include(t => t.Provider)
            .FirstOrDefaultAsync(t => t.OfferId == offerId);

        if (transaction == null)
        {
            return null;
        }

        // Check access permissions
        if (userId != null && !await CanUserAccessTransactionAsync(transaction.Id, userId))
        {
            throw new UnauthorizedException("Bu işleme erişim yetkiniz yok.");
        }

        return MapToTransactionResponse(transaction);
    }

    public async Task<PagedTransactionResult> GetUserTransactionsAsync(string userId, TransactionFilterRequest filter)
    {
        var query = _context.Transactions
            .Include(t => t.Offer)
            .ThenInclude(o => o.Need)
            .Include(t => t.Buyer)
            .Include(t => t.Provider)
            .Where(t => t.BuyerId == userId || t.ProviderId == userId)
            .AsQueryable();

        // Apply filters
        if (filter.OfferId.HasValue)
        {
            query = query.Where(t => t.OfferId == filter.OfferId.Value);
        }

        if (filter.Status.HasValue)
        {
            query = query.Where(t => t.Status == filter.Status.Value);
        }

        if (filter.PaymentGateway.HasValue)
        {
            query = query.Where(t => t.PaymentGateway == filter.PaymentGateway.Value);
        }

        if (filter.CreatedAfter.HasValue)
        {
            query = query.Where(t => t.CreatedAt >= filter.CreatedAfter.Value);
        }

        if (filter.CreatedBefore.HasValue)
        {
            query = query.Where(t => t.CreatedAt <= filter.CreatedBefore.Value);
        }

        query = query.OrderByDescending(t => t.CreatedAt);

        var totalCount = await query.CountAsync();
        var transactions = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return new PagedTransactionResult
        {
            Items = transactions.Select(MapToTransactionResponse).ToList(),
            TotalCount = totalCount,
            Page = filter.Page,
            PageSize = filter.PageSize
        };
    }

    public async Task<TransactionResponse> ReleasePaymentAsync(int transactionId, string buyerId, ReleasePaymentRequest? request = null)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Offer)
            .ThenInclude(o => o.Need)
            .Include(t => t.Buyer)
            .Include(t => t.Provider)
            .FirstOrDefaultAsync(t => t.Id == transactionId);

        if (transaction == null)
        {
            throw new NotFoundException("İşlem bulunamadı.");
        }

        if (transaction.BuyerId != buyerId)
        {
            throw new UnauthorizedException("Bu işlem için ödeme serbest bırakma yetkiniz yok.");
        }

        if (transaction.Status != TransactionStatus.Completed)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Status", new[] { "Sadece tamamlanmış ödemeler serbest bırakılabilir." } }
            });
        }

        // Release payment to provider
        transaction.Status = TransactionStatus.Released;
        transaction.ReleasedAt = DateTime.UtcNow;
        transaction.UpdatedAt = DateTime.UtcNow;

        // Update need status to completed
        var need = transaction.Offer.Need;
        need.Status = NeedStatus.Completed;
        need.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Notify provider
        await _notificationService.SendPushNotificationAsync(
            transaction.ProviderId,
            "Ödeme Serbest Bırakıldı",
            $"'{transaction.Offer.Need.Title}' için ödeme hesabınıza aktarıldı.",
            new { type = "payment", transactionId = transaction.Id }
        );

        _logger.LogInformation("Payment released for transaction {TransactionId}", transactionId);

        return MapToTransactionResponse(transaction);
    }

    public async Task<TransactionResponse> RefundPaymentAsync(int transactionId, string userId, RefundPaymentRequest request)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Offer)
            .ThenInclude(o => o.Need)
            .Include(t => t.Buyer)
            .Include(t => t.Provider)
            .FirstOrDefaultAsync(t => t.Id == transactionId);

        if (transaction == null)
        {
            throw new NotFoundException("İşlem bulunamadı.");
        }

        // Only buyer or provider can request refund
        if (transaction.BuyerId != userId && transaction.ProviderId != userId)
        {
            throw new UnauthorizedException("Bu işlem için iade yetkiniz yok.");
        }

        if (transaction.Status != TransactionStatus.Completed)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Status", new[] { "Sadece tamamlanmış ödemeler iade edilebilir." } }
            });
        }

        // In production, this would call Iyzico refund API
        // For now, just update status
        transaction.Status = TransactionStatus.Refunded;
        transaction.RefundedAt = DateTime.UtcNow;
        transaction.UpdatedAt = DateTime.UtcNow;
        transaction.Metadata = System.Text.Json.JsonSerializer.Serialize(new { RefundReason = request.Reason });

        // Update need status
        var need = transaction.Offer.Need;
        need.Status = NeedStatus.Cancelled;
        need.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Notify both parties
        await _notificationService.SendPushNotificationAsync(
            transaction.BuyerId,
            "Ödeme İade Edildi",
            $"'{transaction.Offer.Need.Title}' için ödeme iade edildi.",
            new { type = "payment", transactionId = transaction.Id }
        );

        await _notificationService.SendPushNotificationAsync(
            transaction.ProviderId,
            "Ödeme İade Edildi",
            $"'{transaction.Offer.Need.Title}' için ödeme alıcıya iade edildi.",
            new { type = "payment", transactionId = transaction.Id }
        );

        _logger.LogInformation("Payment refunded for transaction {TransactionId}. Reason: {Reason}",
            transactionId, request.Reason);

        return MapToTransactionResponse(transaction);
    }

    public async Task<bool> CanUserAccessTransactionAsync(int transactionId, string userId)
    {
        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == transactionId);

        if (transaction == null)
        {
            return false;
        }

        // Buyer or provider can access
        return transaction.BuyerId == userId || transaction.ProviderId == userId;
    }

    public async Task<TransactionStatsResponse> GetUserTransactionStatsAsync(string userId)
    {
        var transactions = await _context.Transactions
            .Where(t => t.BuyerId == userId || t.ProviderId == userId)
            .ToListAsync();

        var asBuyer = transactions.Where(t => t.BuyerId == userId).ToList();
        var asProvider = transactions.Where(t => t.ProviderId == userId).ToList();

        return new TransactionStatsResponse
        {
            TotalTransactions = transactions.Count,
            CompletedTransactions = transactions.Count(t => t.Status == TransactionStatus.Released),
            PendingTransactions = transactions.Count(t => t.Status == TransactionStatus.Pending ||
                                                          t.Status == TransactionStatus.Processing ||
                                                          t.Status == TransactionStatus.Completed),
            RefundedTransactions = transactions.Count(t => t.Status == TransactionStatus.Refunded),
            TotalSpent = asBuyer.Where(t => t.Status != TransactionStatus.Refunded).Sum(t => t.Amount),
            TotalEarned = asProvider.Where(t => t.Status == TransactionStatus.Released).Sum(t => t.Amount),
            Currency = "TRY"
        };
    }

    private TransactionResponse MapToTransactionResponse(Transaction transaction)
    {
        return new TransactionResponse
        {
            Id = transaction.Id,
            OfferId = transaction.OfferId,
            OfferTitle = transaction.Offer?.Need?.Title ?? string.Empty,
            BuyerId = transaction.BuyerId,
            BuyerName = $"{transaction.Buyer?.FirstName} {transaction.Buyer?.LastName}".Trim(),
            ProviderId = transaction.ProviderId,
            ProviderName = $"{transaction.Provider?.FirstName} {transaction.Provider?.LastName}".Trim(),
            Amount = transaction.Amount,
            Currency = transaction.Currency,
            Status = transaction.Status,
            PaymentGateway = transaction.PaymentGateway,
            GatewayTransactionId = transaction.GatewayTransactionId,
            ErrorMessage = transaction.ErrorMessage,
            CreatedAt = transaction.CreatedAt,
            UpdatedAt = transaction.UpdatedAt,
            CompletedAt = transaction.CompletedAt,
            ReleasedAt = transaction.ReleasedAt,
            RefundedAt = transaction.RefundedAt
        };
    }
}