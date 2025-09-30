using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using FluentAssertions;
using API.Services;
using API.Models;
using API.Data;
using API.Interfaces;
using API.Middleware;

namespace API.Tests.Services;

/// <summary>
/// Comprehensive unit tests for PaymentService
/// Tests cover payment initialization, callback handling, escrow, and refunds
/// </summary>
public class PaymentServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Mock<INotificationService> _notificationServiceMock;
    private readonly Mock<ILogger<PaymentService>> _loggerMock;
    private readonly PaymentService _paymentService;

    // Test users
    private readonly string _buyerId = "buyer-test-id";
    private readonly string _providerId = "provider-test-id";

    public PaymentServiceTests()
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

        // Configure Iyzico settings
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

        // Seed test data
        SeedTestData();
    }

    private void SeedTestData()
    {
        var buyer = new ApplicationUser
        {
            Id = _buyerId,
            Email = "buyer@test.com",
            FirstName = "Test",
            LastName = "Buyer",
            PhoneNumber = "+905551234567"
        };

        var provider = new ApplicationUser
        {
            Id = _providerId,
            Email = "provider@test.com",
            FirstName = "Test",
            LastName = "Provider",
            PhoneNumber = "+905559876543"
        };

        var category = new Category
        {
            Id = 1,
            Name = "Services",
            NameTr = "Hizmetler",
            IsActive = true
        };

        var need = new Need
        {
            Id = 1,
            Title = "Web sitesi geliştirme",
            Description = "E-ticaret web sitesi lazım",
            CategoryId = 1,
            UserId = _buyerId,
            Status = NeedStatus.Active,
            MinBudget = 5000,
            MaxBudget = 10000,
            CreatedAt = DateTime.UtcNow
        };

        var offer = new Offer
        {
            Id = 1,
            NeedId = 1,
            ProviderId = _providerId,
            Price = 7500,
            Currency = "TRY",
            Description = "Modern responsive web sitesi",
            DeliveryDays = 14,
            Status = OfferStatus.Accepted,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.AddRange(buyer, provider);
        _context.Categories.Add(category);
        _context.Needs.Add(need);
        _context.Offers.Add(offer);
        _context.SaveChanges();
    }

    [Fact]
    public async Task InitializePaymentAsync_WithValidOffer_ShouldCreateTransaction()
    {
        // Arrange
        var request = new InitializePaymentRequest
        {
            OfferId = 1,
            CardHolderName = "TEST USER",
            CardNumber = "5528790000000008",
            ExpiryMonth = "12",
            ExpiryYear = "2030",
            Cvc = "123",
            BillingAddress = new BillingAddressDto
            {
                Address = "Test Address 123",
                City = "Istanbul",
                Country = "Turkey",
                ZipCode = "34000"
            }
        };

        // Act
        var result = await _paymentService.InitializePaymentAsync(request, _buyerId);

        // Assert
        result.Should().NotBeNull();
        result.TransactionId.Should().BeGreaterThan(0);

        var transaction = await _context.Transactions.FirstOrDefaultAsync(t => t.Id == result.TransactionId);
        transaction.Should().NotBeNull();
        transaction!.BuyerId.Should().Be(_buyerId);
        transaction.ProviderId.Should().Be(_providerId);
        transaction.Amount.Should().Be(7500);
        transaction.Currency.Should().Be("TRY");
        transaction.Status.Should().BeOneOf(TransactionStatus.Processing, TransactionStatus.Failed);
    }

    [Fact]
    public async Task InitializePaymentAsync_WithInvalidOfferId_ShouldThrowNotFoundException()
    {
        // Arrange
        var request = new InitializePaymentRequest
        {
            OfferId = 999,
            CardHolderName = "TEST USER",
            CardNumber = "5528790000000008",
            ExpiryMonth = "12",
            ExpiryYear = "2030",
            Cvc = "123",
            BillingAddress = new BillingAddressDto
            {
                Address = "Test Address",
                City = "Istanbul",
                Country = "Turkey"
            }
        };

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(
            () => _paymentService.InitializePaymentAsync(request, _buyerId)
        );
    }

    [Fact]
    public async Task InitializePaymentAsync_WithNonAcceptedOffer_ShouldThrowValidationException()
    {
        // Arrange - Create a pending offer
        var pendingOffer = new Offer
        {
            Id = 2,
            NeedId = 1,
            ProviderId = _providerId,
            Price = 6000,
            Currency = "TRY",
            Description = "Test offer",
            DeliveryDays = 7,
            Status = OfferStatus.Pending, // Not accepted
            CreatedAt = DateTime.UtcNow
        };
        _context.Offers.Add(pendingOffer);
        await _context.SaveChangesAsync();

        var request = new InitializePaymentRequest
        {
            OfferId = 2,
            CardHolderName = "TEST USER",
            CardNumber = "5528790000000008",
            ExpiryMonth = "12",
            ExpiryYear = "2030",
            Cvc = "123",
            BillingAddress = new BillingAddressDto
            {
                Address = "Test Address",
                City = "Istanbul",
                Country = "Turkey"
            }
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _paymentService.InitializePaymentAsync(request, _buyerId)
        );
    }

    [Fact]
    public async Task InitializePaymentAsync_WhenUserIsNotBuyer_ShouldThrowUnauthorizedException()
    {
        // Arrange
        var request = new InitializePaymentRequest
        {
            OfferId = 1,
            CardHolderName = "TEST USER",
            CardNumber = "5528790000000008",
            ExpiryMonth = "12",
            ExpiryYear = "2030",
            Cvc = "123",
            BillingAddress = new BillingAddressDto
            {
                Address = "Test Address",
                City = "Istanbul",
                Country = "Turkey"
            }
        };

        // Act & Assert - Provider trying to pay
        await Assert.ThrowsAsync<UnauthorizedException>(
            () => _paymentService.InitializePaymentAsync(request, _providerId)
        );
    }

    [Fact]
    public async Task InitializePaymentAsync_WithExistingActiveTransaction_ShouldThrowValidationException()
    {
        // Arrange - Create existing transaction
        var existingTransaction = new Transaction
        {
            OfferId = 1,
            BuyerId = _buyerId,
            ProviderId = _providerId,
            Amount = 7500,
            Currency = "TRY",
            Status = TransactionStatus.Completed,
            PaymentGateway = PaymentGateway.Iyzico,
            ConversationId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };
        _context.Transactions.Add(existingTransaction);
        await _context.SaveChangesAsync();

        var request = new InitializePaymentRequest
        {
            OfferId = 1,
            CardHolderName = "TEST USER",
            CardNumber = "5528790000000008",
            ExpiryMonth = "12",
            ExpiryYear = "2030",
            Cvc = "123",
            BillingAddress = new BillingAddressDto
            {
                Address = "Test Address",
                City = "Istanbul",
                Country = "Turkey"
            }
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _paymentService.InitializePaymentAsync(request, _buyerId)
        );
    }

    [Fact]
    public async Task GetTransactionByIdAsync_WithExistingId_ShouldReturnTransaction()
    {
        // Arrange
        var transaction = new Transaction
        {
            OfferId = 1,
            BuyerId = _buyerId,
            ProviderId = _providerId,
            Amount = 7500,
            Currency = "TRY",
            Status = TransactionStatus.Completed,
            PaymentGateway = PaymentGateway.Iyzico,
            ConversationId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };
        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        // Act
        var result = await _paymentService.GetTransactionByIdAsync(transaction.Id, _buyerId);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(transaction.Id);
        result.Amount.Should().Be(7500);
        result.BuyerId.Should().Be(_buyerId);
        result.ProviderId.Should().Be(_providerId);
    }

    [Fact]
    public async Task GetTransactionByIdAsync_WithNonExistentId_ShouldReturnNull()
    {
        // Act
        var result = await _paymentService.GetTransactionByIdAsync(999, _buyerId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetTransactionByIdAsync_WithUnauthorizedUser_ShouldThrowUnauthorizedException()
    {
        // Arrange
        var transaction = new Transaction
        {
            OfferId = 1,
            BuyerId = _buyerId,
            ProviderId = _providerId,
            Amount = 7500,
            Currency = "TRY",
            Status = TransactionStatus.Completed,
            PaymentGateway = PaymentGateway.Iyzico,
            ConversationId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };
        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        // Act & Assert - Unauthorized user
        await Assert.ThrowsAsync<UnauthorizedException>(
            () => _paymentService.GetTransactionByIdAsync(transaction.Id, "unauthorized-user")
        );
    }

    [Fact]
    public async Task GetUserTransactionsAsync_ShouldReturnUserTransactions()
    {
        // Arrange - Create multiple transactions
        var transactions = new[]
        {
            new Transaction
            {
                OfferId = 1,
                BuyerId = _buyerId,
                ProviderId = _providerId,
                Amount = 7500,
                Currency = "TRY",
                Status = TransactionStatus.Completed,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new Transaction
            {
                OfferId = 1,
                BuyerId = _buyerId,
                ProviderId = _providerId,
                Amount = 5000,
                Currency = "TRY",
                Status = TransactionStatus.Released,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            }
        };
        _context.Transactions.AddRange(transactions);
        await _context.SaveChangesAsync();

        var filter = new TransactionFilterRequest
        {
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _paymentService.GetUserTransactionsAsync(_buyerId, filter);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.Items.First().CreatedAt.Should().BeAfter(result.Items.Last().CreatedAt);
    }

    [Fact]
    public async Task GetUserTransactionsAsync_WithStatusFilter_ShouldReturnFilteredTransactions()
    {
        // Arrange
        var transactions = new[]
        {
            new Transaction
            {
                OfferId = 1,
                BuyerId = _buyerId,
                ProviderId = _providerId,
                Amount = 7500,
                Currency = "TRY",
                Status = TransactionStatus.Completed,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow
            },
            new Transaction
            {
                OfferId = 1,
                BuyerId = _buyerId,
                ProviderId = _providerId,
                Amount = 5000,
                Currency = "TRY",
                Status = TransactionStatus.Released,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow
            }
        };
        _context.Transactions.AddRange(transactions);
        await _context.SaveChangesAsync();

        var filter = new TransactionFilterRequest
        {
            Status = TransactionStatus.Released,
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await _paymentService.GetUserTransactionsAsync(_buyerId, filter);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(1);
        result.Items.First().Status.Should().Be(TransactionStatus.Released);
    }

    [Fact]
    public async Task ReleasePaymentAsync_WithValidTransaction_ShouldReleasePayment()
    {
        // Arrange
        var transaction = new Transaction
        {
            OfferId = 1,
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

        // Act
        var result = await _paymentService.ReleasePaymentAsync(transaction.Id, _buyerId);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be(TransactionStatus.Released);
        result.ReleasedAt.Should().NotBeNull();

        var updatedTransaction = await _context.Transactions.FindAsync(transaction.Id);
        updatedTransaction!.Status.Should().Be(TransactionStatus.Released);
        updatedTransaction.ReleasedAt.Should().NotBeNull();

        // Verify notification was sent
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
    public async Task ReleasePaymentAsync_WithNonCompletedTransaction_ShouldThrowValidationException()
    {
        // Arrange
        var transaction = new Transaction
        {
            OfferId = 1,
            BuyerId = _buyerId,
            ProviderId = _providerId,
            Amount = 7500,
            Currency = "TRY",
            Status = TransactionStatus.Pending, // Not completed
            PaymentGateway = PaymentGateway.Iyzico,
            ConversationId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };
        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _paymentService.ReleasePaymentAsync(transaction.Id, _buyerId)
        );
    }

    [Fact]
    public async Task ReleasePaymentAsync_WithUnauthorizedUser_ShouldThrowUnauthorizedException()
    {
        // Arrange
        var transaction = new Transaction
        {
            OfferId = 1,
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

        // Act & Assert - Provider trying to release (only buyer can release)
        await Assert.ThrowsAsync<UnauthorizedException>(
            () => _paymentService.ReleasePaymentAsync(transaction.Id, _providerId)
        );
    }

    [Fact]
    public async Task RefundPaymentAsync_WithValidTransaction_ShouldProcessRefund()
    {
        // Arrange
        var transaction = new Transaction
        {
            OfferId = 1,
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

        var request = new RefundPaymentRequest
        {
            Reason = "Hizmet tamamlanmadı"
        };

        // Act
        var result = await _paymentService.RefundPaymentAsync(transaction.Id, _buyerId, request);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be(TransactionStatus.Refunded);
        result.RefundedAt.Should().NotBeNull();

        var updatedTransaction = await _context.Transactions.FindAsync(transaction.Id);
        updatedTransaction!.Status.Should().Be(TransactionStatus.Refunded);
        updatedTransaction.RefundedAt.Should().NotBeNull();

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
    public async Task RefundPaymentAsync_WithNonCompletedTransaction_ShouldThrowValidationException()
    {
        // Arrange
        var transaction = new Transaction
        {
            OfferId = 1,
            BuyerId = _buyerId,
            ProviderId = _providerId,
            Amount = 7500,
            Currency = "TRY",
            Status = TransactionStatus.Pending,
            PaymentGateway = PaymentGateway.Iyzico,
            ConversationId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };
        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        var request = new RefundPaymentRequest
        {
            Reason = "Test reason"
        };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _paymentService.RefundPaymentAsync(transaction.Id, _buyerId, request)
        );
    }

    [Fact]
    public async Task CanUserAccessTransactionAsync_WithBuyer_ShouldReturnTrue()
    {
        // Arrange
        var transaction = new Transaction
        {
            OfferId = 1,
            BuyerId = _buyerId,
            ProviderId = _providerId,
            Amount = 7500,
            Currency = "TRY",
            Status = TransactionStatus.Completed,
            PaymentGateway = PaymentGateway.Iyzico,
            ConversationId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };
        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        // Act
        var result = await _paymentService.CanUserAccessTransactionAsync(transaction.Id, _buyerId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanUserAccessTransactionAsync_WithProvider_ShouldReturnTrue()
    {
        // Arrange
        var transaction = new Transaction
        {
            OfferId = 1,
            BuyerId = _buyerId,
            ProviderId = _providerId,
            Amount = 7500,
            Currency = "TRY",
            Status = TransactionStatus.Completed,
            PaymentGateway = PaymentGateway.Iyzico,
            ConversationId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };
        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        // Act
        var result = await _paymentService.CanUserAccessTransactionAsync(transaction.Id, _providerId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanUserAccessTransactionAsync_WithUnauthorizedUser_ShouldReturnFalse()
    {
        // Arrange
        var transaction = new Transaction
        {
            OfferId = 1,
            BuyerId = _buyerId,
            ProviderId = _providerId,
            Amount = 7500,
            Currency = "TRY",
            Status = TransactionStatus.Completed,
            PaymentGateway = PaymentGateway.Iyzico,
            ConversationId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };
        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        // Act
        var result = await _paymentService.CanUserAccessTransactionAsync(transaction.Id, "unauthorized-user");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task GetUserTransactionStatsAsync_ShouldReturnCorrectStats()
    {
        // Arrange - Create various transactions
        var transactions = new[]
        {
            // Completed as buyer
            new Transaction
            {
                OfferId = 1,
                BuyerId = _buyerId,
                ProviderId = _providerId,
                Amount = 1000,
                Currency = "TRY",
                Status = TransactionStatus.Released,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow
            },
            // Pending as buyer
            new Transaction
            {
                OfferId = 1,
                BuyerId = _buyerId,
                ProviderId = _providerId,
                Amount = 2000,
                Currency = "TRY",
                Status = TransactionStatus.Pending,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow
            },
            // Refunded as buyer
            new Transaction
            {
                OfferId = 1,
                BuyerId = _buyerId,
                ProviderId = _providerId,
                Amount = 500,
                Currency = "TRY",
                Status = TransactionStatus.Refunded,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow
            },
            // Completed as provider
            new Transaction
            {
                OfferId = 1,
                BuyerId = "another-buyer",
                ProviderId = _buyerId, // User is provider here
                Amount = 3000,
                Currency = "TRY",
                Status = TransactionStatus.Released,
                PaymentGateway = PaymentGateway.Iyzico,
                ConversationId = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow
            }
        };
        _context.Transactions.AddRange(transactions);
        await _context.SaveChangesAsync();

        // Act
        var result = await _paymentService.GetUserTransactionStatsAsync(_buyerId);

        // Assert
        result.Should().NotBeNull();
        result.TotalTransactions.Should().Be(4);
        result.CompletedTransactions.Should().Be(2); // Released status
        result.PendingTransactions.Should().Be(1);
        result.RefundedTransactions.Should().Be(1);
        result.TotalSpent.Should().Be(1000); // Only released transactions as buyer
        result.TotalEarned.Should().Be(3000); // Released transactions as provider
        result.Currency.Should().Be("TRY");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}