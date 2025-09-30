using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Identity;
using Moq;
using FluentAssertions;
using API.Services;
using API.Models;
using API.Data;
using API.Interfaces;

namespace E2E.Tests;

/// <summary>
/// End-to-end integration tests for the complete payment flow
/// Tests the entire lifecycle: Initialize → 3D Secure → Callback → Escrow → Release/Refund
/// </summary>
public class PaymentFlowTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Mock<INotificationService> _notificationServiceMock;
    private readonly Mock<ILogger<PaymentService>> _loggerMock;
    private readonly PaymentService _paymentService;
    private readonly OfferService _offerService;
    private readonly Mock<IFileStorageService> _fileStorageServiceMock;

    // Test entities
    private readonly string _buyerId = "e2e-buyer-id";
    private readonly string _providerId = "e2e-provider-id";
    private readonly ApplicationUser _buyer;
    private readonly ApplicationUser _provider;
    private readonly Category _category;
    private readonly Need _need;
    private readonly Offer _offer;

    public PaymentFlowTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup mocks
        _configurationMock = new Mock<IConfiguration>();
        _notificationServiceMock = new Mock<INotificationService>();
        _loggerMock = new Mock<ILogger<PaymentService>>();
        _fileStorageServiceMock = new Mock<IFileStorageService>();

        // Configure services
        _configurationMock.Setup(x => x["PaymentGateway:Iyzico:ApiKey"]).Returns("sandbox-test-key");
        _configurationMock.Setup(x => x["PaymentGateway:Iyzico:SecretKey"]).Returns("sandbox-test-secret");
        _configurationMock.Setup(x => x["PaymentGateway:Iyzico:BaseUrl"]).Returns("https://sandbox-api.iyzipay.com");
        _configurationMock.Setup(x => x["PaymentGateway:CallbackUrl"]).Returns("https://test.arayanibul.com");

        _paymentService = new PaymentService(
            _context,
            _configurationMock.Object,
            _notificationServiceMock.Object,
            _loggerMock.Object
        );

        _offerService = new OfferService(
            _context,
            _fileStorageServiceMock.Object,
            _notificationServiceMock.Object
        );

        // Initialize test data
        _buyer = new ApplicationUser
        {
            Id = _buyerId,
            Email = "buyer@e2e-test.com",
            FirstName = "E2E",
            LastName = "Buyer",
            PhoneNumber = "+905551111111",
            UserType = UserType.Buyer,
            CreatedAt = DateTime.UtcNow
        };

        _provider = new ApplicationUser
        {
            Id = _providerId,
            Email = "provider@e2e-test.com",
            FirstName = "E2E",
            LastName = "Provider",
            PhoneNumber = "+905552222222",
            UserType = UserType.Provider,
            CreatedAt = DateTime.UtcNow
        };

        _category = new Category
        {
            Id = 1,
            Name = "E2E Services",
            NameTr = "E2E Hizmetler",
            IsActive = true
        };

        _need = new Need
        {
            Id = 1,
            Title = "E2E Test Need",
            Description = "End-to-end test need for payment flow",
            CategoryId = 1,
            UserId = _buyerId,
            Status = NeedStatus.Active,
            MinBudget = 5000,
            MaxBudget = 10000,
            CreatedAt = DateTime.UtcNow
        };

        _offer = new Offer
        {
            Id = 1,
            NeedId = 1,
            ProviderId = _providerId,
            Price = 7500,
            Currency = "TRY",
            Description = "E2E test offer",
            DeliveryDays = 7,
            Status = OfferStatus.Accepted,
            CreatedAt = DateTime.UtcNow
        };

        // Seed database
        _context.Users.AddRange(_buyer, _provider);
        _context.Categories.Add(_category);
        _context.Needs.Add(_need);
        _context.Offers.Add(_offer);
        _context.SaveChanges();
    }

    [Fact]
    public async Task CompletePaymentFlow_SuccessfulPaymentAndRelease_ShouldCompleteEntireFlow()
    {
        // ==========================================
        // STEP 1: Initialize Payment
        // ==========================================
        var initRequest = new InitializePaymentRequest
        {
            OfferId = _offer.Id,
            CardHolderName = "E2E TEST USER",
            CardNumber = "5528790000000008",
            ExpiryMonth = "12",
            ExpiryYear = "2030",
            Cvc = "123",
            BillingAddress = new BillingAddressDto
            {
                Address = "E2E Test Address 123",
                City = "Istanbul",
                Country = "Turkey",
                ZipCode = "34000"
            }
        };

        var initResult = await _paymentService.InitializePaymentAsync(initRequest, _buyerId);

        // Verify payment initialization
        initResult.Should().NotBeNull();
        initResult.TransactionId.Should().BeGreaterThan(0);
        initResult.Status.Should().BeOneOf(TransactionStatus.Processing, TransactionStatus.Failed);

        var transaction = await _context.Transactions.FindAsync(initResult.TransactionId);
        transaction.Should().NotBeNull();
        transaction!.BuyerId.Should().Be(_buyerId);
        transaction.ProviderId.Should().Be(_providerId);
        transaction.Amount.Should().Be(7500);
        transaction.Currency.Should().Be("TRY");
        transaction.ConversationId.Should().NotBeNullOrEmpty();

        // ==========================================
        // STEP 2: Simulate 3D Secure Completion
        // ==========================================
        // In a real scenario, user would complete 3D Secure authentication
        // and payment gateway would redirect back to callback URL
        // For testing, we'll manually update transaction to simulate successful payment

        transaction.Status = TransactionStatus.Processing;
        transaction.PaymentToken = Guid.NewGuid().ToString();
        await _context.SaveChangesAsync();

        // ==========================================
        // STEP 3: Handle Payment Callback
        // ==========================================
        var callbackRequest = new PaymentCallbackRequest
        {
            Status = "success",
            PaymentId = transaction.PaymentToken,
            ConversationId = transaction.ConversationId
        };

        // Note: The actual HandlePaymentCallbackAsync would call Iyzico API
        // For E2E test, we'll simulate the successful callback by manually updating transaction
        transaction.Status = TransactionStatus.Completed;
        transaction.GatewayTransactionId = "mock-gateway-tx-" + Guid.NewGuid().ToString();
        transaction.CompletedAt = DateTime.UtcNow;
        transaction.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Verify transaction is in escrow
        var completedTransaction = await _context.Transactions.FindAsync(transaction.Id);
        completedTransaction.Should().NotBeNull();
        completedTransaction!.Status.Should().Be(TransactionStatus.Completed);
        completedTransaction.CompletedAt.Should().NotBeNull();

        // ==========================================
        // STEP 4: Service Delivery Period
        // ==========================================
        // In a real scenario, provider would deliver the service
        // and buyer would confirm completion
        // Simulating time passing and service being delivered

        await Task.Delay(100); // Simulate time passing

        // ==========================================
        // STEP 5: Release Payment to Provider
        // ==========================================
        var releaseRequest = new ReleasePaymentRequest
        {
            Notes = "Service delivered successfully"
        };

        var releaseResult = await _paymentService.ReleasePaymentAsync(transaction.Id, _buyerId, releaseRequest);

        // Verify payment release
        releaseResult.Should().NotBeNull();
        releaseResult.Status.Should().Be(TransactionStatus.Released);
        releaseResult.ReleasedAt.Should().NotBeNull();
        releaseResult.Amount.Should().Be(7500);

        // Verify database state
        var releasedTransaction = await _context.Transactions.FindAsync(transaction.Id);
        releasedTransaction.Should().NotBeNull();
        releasedTransaction!.Status.Should().Be(TransactionStatus.Released);
        releasedTransaction.ReleasedAt.Should().NotBeNull();
        releasedTransaction.ReleasedAt.Should().BeAfter(releasedTransaction.CompletedAt!.Value);

        // Verify need status is updated to completed
        var completedNeed = await _context.Needs.FindAsync(_need.Id);
        completedNeed.Should().NotBeNull();
        completedNeed!.Status.Should().Be(NeedStatus.Completed);

        // Verify notification was sent to provider
        _notificationServiceMock.Verify(
            x => x.SendPushNotificationAsync(
                _providerId,
                "Ödeme Serbest Bırakıldı",
                It.IsAny<string>(),
                It.IsAny<object>()
            ),
            Times.Once
        );
    }

    [Fact]
    public async Task CompletePaymentFlow_RefundScenario_ShouldProcessRefundCorrectly()
    {
        // ==========================================
        // STEP 1-3: Initialize and Complete Payment (same as success flow)
        // ==========================================
        var initRequest = new InitializePaymentRequest
        {
            OfferId = _offer.Id,
            CardHolderName = "E2E TEST USER",
            CardNumber = "5528790000000008",
            ExpiryMonth = "12",
            ExpiryYear = "2030",
            Cvc = "123",
            BillingAddress = new BillingAddressDto
            {
                Address = "E2E Test Address 123",
                City = "Istanbul",
                Country = "Turkey"
            }
        };

        var initResult = await _paymentService.InitializePaymentAsync(initRequest, _buyerId);
        var transaction = await _context.Transactions.FindAsync(initResult.TransactionId);

        // Simulate successful payment completion
        transaction!.Status = TransactionStatus.Completed;
        transaction.GatewayTransactionId = "mock-gateway-tx-" + Guid.NewGuid().ToString();
        transaction.CompletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // ==========================================
        // STEP 4: Issue Occurs - Service Not Delivered
        // ==========================================
        // Buyer requests refund because service was not delivered as promised

        var refundRequest = new RefundPaymentRequest
        {
            Reason = "Hizmet teslim edilmedi veya tatmin edici değildi"
        };

        var refundResult = await _paymentService.RefundPaymentAsync(transaction.Id, _buyerId, refundRequest);

        // Verify refund was processed
        refundResult.Should().NotBeNull();
        refundResult.Status.Should().Be(TransactionStatus.Refunded);
        refundResult.RefundedAt.Should().NotBeNull();

        // Verify database state
        var refundedTransaction = await _context.Transactions.FindAsync(transaction.Id);
        refundedTransaction.Should().NotBeNull();
        refundedTransaction!.Status.Should().Be(TransactionStatus.Refunded);
        refundedTransaction.RefundedAt.Should().NotBeNull();
        refundedTransaction.Metadata.Should().Contain("Hizmet teslim edilmedi");

        // Verify need status is updated to cancelled
        var cancelledNeed = await _context.Needs.FindAsync(_need.Id);
        cancelledNeed.Should().NotBeNull();
        cancelledNeed!.Status.Should().Be(NeedStatus.Cancelled);

        // Verify notifications were sent to both parties
        _notificationServiceMock.Verify(
            x => x.SendPushNotificationAsync(
                It.IsAny<string>(),
                "Ödeme İade Edildi",
                It.IsAny<string>(),
                It.IsAny<object>()
            ),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task CompletePaymentFlow_MultipleOffersOneAccepted_ShouldOnlyAllowPaymentForAcceptedOffer()
    {
        // ==========================================
        // SETUP: Create multiple offers for the same need
        // ==========================================
        var secondProvider = new ApplicationUser
        {
            Id = "second-provider",
            Email = "provider2@e2e-test.com",
            FirstName = "Second",
            LastName = "Provider",
            PhoneNumber = "+905553333333",
            UserType = UserType.Provider,
            CreatedAt = DateTime.UtcNow
        };

        var secondOffer = new Offer
        {
            Id = 2,
            NeedId = _need.Id,
            ProviderId = "second-provider",
            Price = 6500,
            Currency = "TRY",
            Description = "Alternative offer",
            DeliveryDays = 10,
            Status = OfferStatus.Pending, // Not accepted
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(secondProvider);
        _context.Offers.Add(secondOffer);
        await _context.SaveChangesAsync();

        // ==========================================
        // TEST: Try to pay for non-accepted offer
        // ==========================================
        var invalidRequest = new InitializePaymentRequest
        {
            OfferId = secondOffer.Id,
            CardHolderName = "E2E TEST USER",
            CardNumber = "5528790000000008",
            ExpiryMonth = "12",
            ExpiryYear = "2030",
            Cvc = "123",
            BillingAddress = new BillingAddressDto
            {
                Address = "E2E Test Address",
                City = "Istanbul",
                Country = "Turkey"
            }
        };

        // Should throw validation exception
        await Assert.ThrowsAsync<API.Middleware.ValidationException>(
            () => _paymentService.InitializePaymentAsync(invalidRequest, _buyerId)
        );

        // ==========================================
        // TEST: Pay for accepted offer should work
        // ==========================================
        var validRequest = new InitializePaymentRequest
        {
            OfferId = _offer.Id, // Accepted offer
            CardHolderName = "E2E TEST USER",
            CardNumber = "5528790000000008",
            ExpiryMonth = "12",
            ExpiryYear = "2030",
            Cvc = "123",
            BillingAddress = new BillingAddressDto
            {
                Address = "E2E Test Address",
                City = "Istanbul",
                Country = "Turkey"
            }
        };

        var result = await _paymentService.InitializePaymentAsync(validRequest, _buyerId);
        result.Should().NotBeNull();
        result.TransactionId.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task CompletePaymentFlow_TransactionAccessControl_ShouldEnforceAuthorization()
    {
        // ==========================================
        // SETUP: Create and complete a transaction
        // ==========================================
        var transaction = new Transaction
        {
            OfferId = _offer.Id,
            BuyerId = _buyerId,
            ProviderId = _providerId,
            Amount = 7500,
            Currency = "TRY",
            Status = TransactionStatus.Completed,
            PaymentGateway = PaymentGateway.Iyzico,
            ConversationId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow
        };
        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        // ==========================================
        // TEST: Buyer can access their transaction
        // ==========================================
        var buyerAccess = await _paymentService.CanUserAccessTransactionAsync(transaction.Id, _buyerId);
        buyerAccess.Should().BeTrue();

        // ==========================================
        // TEST: Provider can access their transaction
        // ==========================================
        var providerAccess = await _paymentService.CanUserAccessTransactionAsync(transaction.Id, _providerId);
        providerAccess.Should().BeTrue();

        // ==========================================
        // TEST: Unauthorized user cannot access transaction
        // ==========================================
        var unauthorizedAccess = await _paymentService.CanUserAccessTransactionAsync(transaction.Id, "unauthorized-user");
        unauthorizedAccess.Should().BeFalse();

        // ==========================================
        // TEST: Only buyer can release payment
        // ==========================================
        var releaseRequest = new ReleasePaymentRequest { Notes = "Test" };
        await Assert.ThrowsAsync<API.Middleware.UnauthorizedException>(
            () => _paymentService.ReleasePaymentAsync(transaction.Id, _providerId, releaseRequest)
        );

        // Buyer should be able to release
        var releaseResult = await _paymentService.ReleasePaymentAsync(transaction.Id, _buyerId, releaseRequest);
        releaseResult.Should().NotBeNull();
        releaseResult.Status.Should().Be(TransactionStatus.Released);
    }

    [Fact]
    public async Task CompletePaymentFlow_GetUserTransactionStats_ShouldCalculateCorrectly()
    {
        // ==========================================
        // SETUP: Create multiple transactions with different statuses
        // ==========================================
        var transactions = new[]
        {
            new Transaction
            {
                OfferId = _offer.Id,
                BuyerId = _buyerId,
                ProviderId = _providerId,
                Amount = 1000,
                Currency = "TRY",
                Status = TransactionStatus.Released,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow,
                ReleasedAt = DateTime.UtcNow
            },
            new Transaction
            {
                OfferId = _offer.Id,
                BuyerId = _buyerId,
                ProviderId = _providerId,
                Amount = 2000,
                Currency = "TRY",
                Status = TransactionStatus.Pending,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow
            },
            new Transaction
            {
                OfferId = _offer.Id,
                BuyerId = _buyerId,
                ProviderId = _providerId,
                Amount = 500,
                Currency = "TRY",
                Status = TransactionStatus.Refunded,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow,
                RefundedAt = DateTime.UtcNow
            },
            new Transaction
            {
                OfferId = _offer.Id,
                BuyerId = "another-buyer",
                ProviderId = _buyerId, // User is provider here
                Amount = 3000,
                Currency = "TRY",
                Status = TransactionStatus.Released,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow,
                ReleasedAt = DateTime.UtcNow
            }
        };
        _context.Transactions.AddRange(transactions);
        await _context.SaveChangesAsync();

        // ==========================================
        // TEST: Get transaction statistics
        // ==========================================
        var stats = await _paymentService.GetUserTransactionStatsAsync(_buyerId);

        // Verify statistics
        stats.Should().NotBeNull();
        stats.TotalTransactions.Should().Be(4);
        stats.CompletedTransactions.Should().Be(2); // Released status only
        stats.PendingTransactions.Should().Be(1);
        stats.RefundedTransactions.Should().Be(1);
        stats.TotalSpent.Should().Be(1000); // Only released, not refunded
        stats.TotalEarned.Should().Be(3000); // As provider
        stats.Currency.Should().Be("TRY");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}