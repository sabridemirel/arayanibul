using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using FluentAssertions;
using API.Services;
using API.Models;
using API.Data;
using API.Interfaces;

namespace API.Tests.Services;

/// <summary>
/// Comprehensive unit tests for UserService
/// Tests cover user statistics, profile management, and caching
/// </summary>
public class UserServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly Mock<IFileStorageService> _fileStorageServiceMock;
    private readonly Mock<ICacheService> _cacheServiceMock;
    private readonly Mock<ILogger<UserService>> _loggerMock;
    private readonly UserService _userService;

    private readonly string _testUserId = "test-user-id";
    private readonly string _providerUserId = "provider-user-id";
    private readonly ApplicationUser _testUser;

    public UserServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup mocks
        _userManagerMock = MockUserManager();
        _fileStorageServiceMock = new Mock<IFileStorageService>();
        _cacheServiceMock = new Mock<ICacheService>();
        _loggerMock = new Mock<ILogger<UserService>>();

        _userService = new UserService(
            _context,
            _userManagerMock.Object,
            _fileStorageServiceMock.Object,
            _cacheServiceMock.Object,
            _loggerMock.Object
        );

        // Setup test user
        _testUser = new ApplicationUser
        {
            Id = _testUserId,
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            PhoneNumber = "+905551234567",
            UserType = UserType.Buyer,
            VerificationBadges = VerificationBadges.EmailVerified | VerificationBadges.PhoneVerified,
            CreatedAt = DateTime.UtcNow.AddMonths(-6)
        };

        var provider = new ApplicationUser
        {
            Id = _providerUserId,
            Email = "provider@example.com",
            FirstName = "Provider",
            LastName = "User",
            PhoneNumber = "+905559876543",
            UserType = UserType.Provider,
            VerificationBadges = VerificationBadges.EmailVerified,
            CreatedAt = DateTime.UtcNow.AddYears(-1)
        };

        _context.Users.AddRange(_testUser, provider);
        _context.SaveChanges();

        _userManagerMock.Setup(x => x.FindByIdAsync(_testUserId))
            .ReturnsAsync(_testUser);
        _userManagerMock.Setup(x => x.FindByIdAsync(_providerUserId))
            .ReturnsAsync(provider);

        // Seed test data
        SeedTestData();
    }

    private Mock<UserManager<ApplicationUser>> MockUserManager()
    {
        var store = new Mock<IUserStore<ApplicationUser>>();
        return new Mock<UserManager<ApplicationUser>>(store.Object, null, null, null, null, null, null, null, null);
    }

    private void SeedTestData()
    {
        var category = new Category
        {
            Id = 1,
            Name = "Services",
            NameTr = "Hizmetler",
            IsActive = true
        };

        // Create needs
        var need1 = new Need
        {
            Id = 1,
            Title = "Need 1",
            Description = "Test need 1",
            CategoryId = 1,
            UserId = _testUserId,
            Status = NeedStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        var need2 = new Need
        {
            Id = 2,
            Title = "Need 2",
            Description = "Test need 2",
            CategoryId = 1,
            UserId = _testUserId,
            Status = NeedStatus.Completed,
            CreatedAt = DateTime.UtcNow
        };

        // Create offers
        var offer1 = new Offer
        {
            Id = 1,
            NeedId = 1,
            ProviderId = _providerUserId,
            Price = 1000,
            Currency = "TRY",
            Description = "Offer 1",
            Status = OfferStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        var offer2 = new Offer
        {
            Id = 2,
            NeedId = 2,
            ProviderId = _providerUserId,
            Price = 2000,
            Currency = "TRY",
            Description = "Offer 2",
            Status = OfferStatus.Accepted,
            CreatedAt = DateTime.UtcNow
        };

        // Create transactions
        var transaction1 = new Transaction
        {
            Id = 1,
            OfferId = 2,
            BuyerId = _testUserId,
            ProviderId = _providerUserId,
            Amount = 2000,
            Currency = "TRY",
            Status = TransactionStatus.Released,
            PaymentGateway = PaymentGateway.Iyzico,
            ConversationId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            CompletedAt = DateTime.UtcNow.AddDays(-9),
            ReleasedAt = DateTime.UtcNow.AddDays(-8)
        };

        var transaction2 = new Transaction
        {
            Id = 2,
            OfferId = 1,
            BuyerId = "another-buyer",
            ProviderId = _testUserId, // Test user as provider
            Amount = 1500,
            Currency = "TRY",
            Status = TransactionStatus.Released,
            PaymentGateway = PaymentGateway.Iyzico,
            ConversationId = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            CompletedAt = DateTime.UtcNow.AddDays(-4),
            ReleasedAt = DateTime.UtcNow.AddDays(-3)
        };

        // Create reviews
        var review1 = new Review
        {
            Id = 1,
            ReviewerId = _providerUserId,
            RevieweeId = _testUserId,
            OfferId = 1,
            Rating = 5,
            Comment = "Great!",
            IsVisible = true,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };

        var review2 = new Review
        {
            Id = 2,
            ReviewerId = _testUserId,
            RevieweeId = _providerUserId,
            OfferId = 2,
            Rating = 4,
            Comment = "Good",
            IsVisible = true,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };

        _context.Categories.Add(category);
        _context.Needs.AddRange(need1, need2);
        _context.Offers.AddRange(offer1, offer2);
        _context.Transactions.AddRange(transaction1, transaction2);
        _context.Reviews.AddRange(review1, review2);
        _context.SaveChanges();
    }

    [Fact]
    public async Task GetUserProfileAsync_WithValidUserId_ShouldReturnUser()
    {
        // Act
        var result = await _userService.GetUserProfileAsync(_testUserId);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(_testUserId);
        result.Email.Should().Be("test@example.com");
        result.FirstName.Should().Be("Test");
        result.LastName.Should().Be("User");
    }

    [Fact]
    public async Task GetUserProfileAsync_WithInvalidUserId_ShouldReturnNull()
    {
        // Arrange
        _userManagerMock.Setup(x => x.FindByIdAsync("invalid-id"))
            .ReturnsAsync((ApplicationUser?)null);

        // Act
        var result = await _userService.GetUserProfileAsync("invalid-id");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateUserProfileAsync_WithValidData_ShouldUpdateUser()
    {
        // Arrange
        var updateRequest = new UpdateProfileRequest
        {
            FirstName = "Updated",
            LastName = "Name",
            PhoneNumber = "+905559999999",
            Address = "New Address",
            Latitude = 41.0082,
            Longitude = 28.9784,
            UserType = UserType.Both
        };

        _userManagerMock.Setup(x => x.UpdateAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _userService.UpdateUserProfileAsync(_testUserId, updateRequest);

        // Assert
        result.Should().NotBeNull();
        result!.FirstName.Should().Be("Updated");
        result.LastName.Should().Be("Name");
        result.PhoneNumber.Should().Be("+905559999999");
        result.Address.Should().Be("New Address");
        result.Latitude.Should().Be(41.0082);
        result.Longitude.Should().Be(28.9784);
        result.UserType.Should().Be(UserType.Both);

        _userManagerMock.Verify(x => x.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Once);
    }

    [Fact]
    public async Task UpdateUserProfileAsync_WithInvalidUserId_ShouldReturnNull()
    {
        // Arrange
        _userManagerMock.Setup(x => x.FindByIdAsync("invalid-id"))
            .ReturnsAsync((ApplicationUser?)null);

        var updateRequest = new UpdateProfileRequest
        {
            FirstName = "Updated"
        };

        // Act
        var result = await _userService.UpdateUserProfileAsync("invalid-id", updateRequest);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UploadProfileImageAsync_WithValidFile_ShouldUploadAndUpdateUser()
    {
        // Arrange
        var mockFile = CreateMockFormFile("profile.jpg");
        var imageUrl = "https://storage.example.com/profile.jpg";

        _fileStorageServiceMock.Setup(x => x.UploadImageAsync(mockFile, "profiles"))
            .ReturnsAsync(imageUrl);
        _userManagerMock.Setup(x => x.UpdateAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _userService.UploadProfileImageAsync(_testUserId, mockFile);

        // Assert
        result.Should().Be(imageUrl);
        _fileStorageServiceMock.Verify(x => x.UploadImageAsync(mockFile, "profiles"), Times.Once);
        _userManagerMock.Verify(x => x.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Once);
    }

    [Fact]
    public async Task UploadProfileImageAsync_WithExistingImage_ShouldDeleteOldImage()
    {
        // Arrange
        _testUser.ProfileImageUrl = "https://storage.example.com/old-profile.jpg";
        var mockFile = CreateMockFormFile("new-profile.jpg");
        var newImageUrl = "https://storage.example.com/new-profile.jpg";

        _fileStorageServiceMock.Setup(x => x.DeleteFileAsync(_testUser.ProfileImageUrl))
            .ReturnsAsync(true);
        _fileStorageServiceMock.Setup(x => x.UploadImageAsync(mockFile, "profiles"))
            .ReturnsAsync(newImageUrl);
        _userManagerMock.Setup(x => x.UpdateAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _userService.UploadProfileImageAsync(_testUserId, mockFile);

        // Assert
        result.Should().Be(newImageUrl);
        _fileStorageServiceMock.Verify(x => x.DeleteFileAsync(_testUser.ProfileImageUrl), Times.Once);
        _fileStorageServiceMock.Verify(x => x.UploadImageAsync(mockFile, "profiles"), Times.Once);
    }

    [Fact]
    public async Task DeleteProfileImageAsync_WithExistingImage_ShouldDeleteImage()
    {
        // Arrange
        _testUser.ProfileImageUrl = "https://storage.example.com/profile.jpg";

        _fileStorageServiceMock.Setup(x => x.DeleteFileAsync(_testUser.ProfileImageUrl))
            .ReturnsAsync(true);
        _userManagerMock.Setup(x => x.UpdateAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _userService.DeleteProfileImageAsync(_testUserId);

        // Assert
        result.Should().BeTrue();
        _fileStorageServiceMock.Verify(x => x.DeleteFileAsync(_testUser.ProfileImageUrl), Times.Once);
        _userManagerMock.Verify(x => x.UpdateAsync(It.IsAny<ApplicationUser>()), Times.Once);
    }

    [Fact]
    public async Task DeleteProfileImageAsync_WithoutExistingImage_ShouldReturnFalse()
    {
        // Arrange
        _testUser.ProfileImageUrl = null;

        // Act
        var result = await _userService.DeleteProfileImageAsync(_testUserId);

        // Assert
        result.Should().BeFalse();
        _fileStorageServiceMock.Verify(x => x.DeleteFileAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetUserStatisticsAsync_ShouldReturnCompleteStats()
    {
        // Arrange
        _cacheServiceMock.Setup(x => x.GetAsync<UserStatisticsResponse>(It.IsAny<string>()))
            .ReturnsAsync((UserStatisticsResponse?)null); // Cache miss

        // Act
        var result = await _userService.GetUserStatisticsAsync(_testUserId);

        // Assert
        result.Should().NotBeNull();
        result!.NeedsCount.Should().Be(2); // User created 2 needs
        result.OffersReceivedCount.Should().Be(2); // User received 2 offers
        result.CompletedTransactionsCount.Should().Be(2); // 1 as buyer, 1 as provider
        result.TotalSpent.Should().Be(2000); // Released transaction as buyer
        result.TotalEarned.Should().Be(1500); // Released transaction as provider
        result.AverageRating.Should().Be(5.0); // Only 1 review for test user
        result.ReviewCount.Should().Be(1);
        result.VerificationBadges.Should().Be(VerificationBadges.EmailVerified | VerificationBadges.PhoneVerified);
        result.MemberSince.Should().BeCloseTo(_testUser.CreatedAt, TimeSpan.FromSeconds(1));

        // Verify cache was set
        _cacheServiceMock.Verify(
            x => x.SetAsync(It.IsAny<string>(), It.IsAny<UserStatisticsResponse>(), TimeSpan.FromMinutes(5)),
            Times.Once
        );
    }

    [Fact]
    public async Task GetUserStatisticsAsync_WithCacheHit_ShouldReturnCachedData()
    {
        // Arrange
        var cachedStats = new UserStatisticsResponse
        {
            NeedsCount = 5,
            CompletedTransactionsCount = 3,
            TotalSpent = 5000,
            TotalEarned = 3000
        };

        _cacheServiceMock.Setup(x => x.GetAsync<UserStatisticsResponse>(It.IsAny<string>()))
            .ReturnsAsync(cachedStats);

        // Act
        var result = await _userService.GetUserStatisticsAsync(_testUserId);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEquivalentTo(cachedStats);

        // Verify cache was read but not set
        _cacheServiceMock.Verify(
            x => x.GetAsync<UserStatisticsResponse>(It.IsAny<string>()),
            Times.Once
        );
        _cacheServiceMock.Verify(
            x => x.SetAsync(It.IsAny<string>(), It.IsAny<UserStatisticsResponse>(), It.IsAny<TimeSpan>()),
            Times.Never
        );
    }

    [Fact]
    public async Task GetUserStatisticsAsync_WithNonExistentUser_ShouldReturnNull()
    {
        // Arrange
        _userManagerMock.Setup(x => x.FindByIdAsync("non-existent"))
            .ReturnsAsync((ApplicationUser?)null);

        // Act
        var result = await _userService.GetUserStatisticsAsync("non-existent");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetPublicUserStatisticsAsync_ShouldReturnPublicStatsOnly()
    {
        // Arrange
        _cacheServiceMock.Setup(x => x.GetAsync<PublicUserStatisticsResponse>(It.IsAny<string>()))
            .ReturnsAsync((PublicUserStatisticsResponse?)null); // Cache miss

        // Act
        var result = await _userService.GetPublicUserStatisticsAsync(_testUserId);

        // Assert
        result.Should().NotBeNull();
        result!.CompletedTransactionsCount.Should().Be(2);
        result.AverageRating.Should().Be(5.0);
        result.ReviewCount.Should().Be(1);
        result.VerificationBadges.Should().Be(VerificationBadges.EmailVerified | VerificationBadges.PhoneVerified);
        result.UserType.Should().Be(UserType.Buyer);
        result.MemberSince.Should().BeCloseTo(_testUser.CreatedAt, TimeSpan.FromSeconds(1));

        // Verify cache was set
        _cacheServiceMock.Verify(
            x => x.SetAsync(It.IsAny<string>(), It.IsAny<PublicUserStatisticsResponse>(), TimeSpan.FromMinutes(5)),
            Times.Once
        );
    }

    [Fact]
    public async Task GetPublicUserStatisticsAsync_WithCacheHit_ShouldReturnCachedData()
    {
        // Arrange
        var cachedStats = new PublicUserStatisticsResponse
        {
            CompletedTransactionsCount = 10,
            AverageRating = 4.5,
            ReviewCount = 20
        };

        _cacheServiceMock.Setup(x => x.GetAsync<PublicUserStatisticsResponse>(It.IsAny<string>()))
            .ReturnsAsync(cachedStats);

        // Act
        var result = await _userService.GetPublicUserStatisticsAsync(_testUserId);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEquivalentTo(cachedStats);
    }

    [Fact]
    public async Task GetPublicUserStatisticsAsync_ShouldNotExposePrivateData()
    {
        // Arrange
        _cacheServiceMock.Setup(x => x.GetAsync<PublicUserStatisticsResponse>(It.IsAny<string>()))
            .ReturnsAsync((PublicUserStatisticsResponse?)null);

        // Act
        var result = await _userService.GetPublicUserStatisticsAsync(_testUserId);

        // Assert - Public stats should not have TotalSpent/TotalEarned/NeedsCount/OffersCount
        result.Should().NotBeNull();
        var resultType = result!.GetType();
        resultType.GetProperty("TotalSpent").Should().BeNull();
        resultType.GetProperty("TotalEarned").Should().BeNull();
        resultType.GetProperty("NeedsCount").Should().BeNull();
        resultType.GetProperty("OffersGivenCount").Should().BeNull();
    }

    [Fact]
    public async Task GetUserStatisticsAsync_WithNoData_ShouldReturnZeroStats()
    {
        // Arrange - Create a new user with no activity
        var newUserId = "new-user-id";
        var newUser = new ApplicationUser
        {
            Id = newUserId,
            Email = "new@example.com",
            FirstName = "New",
            LastName = "User",
            VerificationBadges = VerificationBadges.None,
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        _userManagerMock.Setup(x => x.FindByIdAsync(newUserId))
            .ReturnsAsync(newUser);
        _cacheServiceMock.Setup(x => x.GetAsync<UserStatisticsResponse>(It.IsAny<string>()))
            .ReturnsAsync((UserStatisticsResponse?)null);

        // Act
        var result = await _userService.GetUserStatisticsAsync(newUserId);

        // Assert
        result.Should().NotBeNull();
        result!.NeedsCount.Should().Be(0);
        result.OffersGivenCount.Should().Be(0);
        result.OffersReceivedCount.Should().Be(0);
        result.CompletedTransactionsCount.Should().Be(0);
        result.TotalSpent.Should().Be(0);
        result.TotalEarned.Should().Be(0);
        result.AverageRating.Should().Be(0);
        result.ReviewCount.Should().Be(0);
    }

    // Helper methods
    private IFormFile CreateMockFormFile(string fileName)
    {
        var fileMock = new Mock<IFormFile>();
        var content = "Fake image content";
        var ms = new MemoryStream();
        var writer = new StreamWriter(ms);
        writer.Write(content);
        writer.Flush();
        ms.Position = 0;

        fileMock.Setup(_ => _.OpenReadStream()).Returns(ms);
        fileMock.Setup(_ => _.FileName).Returns(fileName);
        fileMock.Setup(_ => _.Length).Returns(ms.Length);

        return fileMock.Object;
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}