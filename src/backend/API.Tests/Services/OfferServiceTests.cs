using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Moq;
using FluentAssertions;
using API.Services;
using API.Models;
using API.Data;
using API.Interfaces;

namespace API.Tests.Services;

public class OfferServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IFileStorageService> _fileStorageServiceMock;
    private readonly Mock<INotificationService> _notificationServiceMock;
    private readonly OfferService _offerService;

    public OfferServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup mocks
        _fileStorageServiceMock = new Mock<IFileStorageService>();
        _notificationServiceMock = new Mock<INotificationService>();

        _offerService = new OfferService(_context, _fileStorageServiceMock.Object, _notificationServiceMock.Object);

        // Seed test data
        SeedTestData();
    }

    private void SeedTestData()
    {
        var category = new Category
        {
            Id = 1,
            Name = "Electronics",
            NameTr = "Elektronik",
            IsActive = true
        };

        var buyer = new ApplicationUser
        {
            Id = "buyer-id",
            Email = "buyer@example.com",
            FirstName = "Buyer",
            LastName = "User"
        };

        var provider = new ApplicationUser
        {
            Id = "provider-id",
            Email = "provider@example.com",
            FirstName = "Provider",
            LastName = "User"
        };

        var need = new Need
        {
            Id = 1,
            Title = "iPhone 13 Pro arıyorum",
            Description = "Temiz durumda iPhone 13 Pro arıyorum",
            CategoryId = 1,
            UserId = "buyer-id",
            Status = NeedStatus.Active,
            MinBudget = 20000,
            MaxBudget = 25000,
            CreatedAt = DateTime.UtcNow
        };

        _context.Categories.Add(category);
        _context.Users.AddRange(buyer, provider);
        _context.Needs.Add(need);
        _context.SaveChanges();
    }

    [Fact]
    public async Task CreateOfferAsync_WithValidData_ShouldCreateOffer()
    {
        // Arrange
        var request = new CreateOfferRequest
        {
            NeedId = 1,
            Price = 22000,
            Description = "Sıfır kutusunda iPhone 13 Pro",
            DeliveryDays = 1
        };

        var providerId = "provider-id";

        // Act
        var result = await _offerService.CreateOfferAsync(request, providerId);

        // Assert
        result.Should().NotBeNull();
        result.Price.Should().Be(request.Price);
        result.Description.Should().Be(request.Description);
        result.DeliveryDays.Should().Be(request.DeliveryDays);
        result.Status.Should().Be(OfferStatus.Pending);

        var offerInDb = await _context.Offers.FirstOrDefaultAsync(o => o.Price == request.Price);
        offerInDb.Should().NotBeNull();
    }

    [Fact]
    public async Task GetOfferByIdAsync_WithExistingId_ShouldReturnOffer()
    {
        // Arrange
        var offer = new Offer
        {
            NeedId = 1,
            ProviderId = "provider-id",
            Price = 22000,
            Description = "Test offer",
            DeliveryDays = 1,
            Status = OfferStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Offers.Add(offer);
        await _context.SaveChangesAsync();

        // Act
        var result = await _offerService.GetOfferByIdAsync(offer.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Price.Should().Be(offer.Price);
        result.Description.Should().Be(offer.Description);
    }

    [Fact]
    public async Task AcceptOfferAsync_WithValidOffer_ShouldAcceptOffer()
    {
        // Arrange
        var offer = new Offer
        {
            NeedId = 1,
            ProviderId = "provider-id",
            Price = 22000,
            Description = "Test offer",
            DeliveryDays = 1,
            Status = OfferStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Offers.Add(offer);
        await _context.SaveChangesAsync();

        // Act
        var result = await _offerService.AcceptOfferAsync(offer.Id, "buyer-id");

        // Assert
        result.Should().BeTrue();

        var updatedOffer = await _context.Offers.FindAsync(offer.Id);
        updatedOffer!.Status.Should().Be(OfferStatus.Accepted);

        // Verify notification was sent
        _notificationServiceMock.Verify(
            x => x.NotifyOfferAcceptedAsync("provider-id", offer.Id),
            Times.Once);
    }

    [Fact]
    public async Task RejectOfferAsync_WithValidOffer_ShouldRejectOffer()
    {
        // Arrange
        var offer = new Offer
        {
            NeedId = 1,
            ProviderId = "provider-id",
            Price = 22000,
            Description = "Test offer",
            DeliveryDays = 1,
            Status = OfferStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Offers.Add(offer);
        await _context.SaveChangesAsync();

        // Act
        var result = await _offerService.RejectOfferAsync(offer.Id, "buyer-id", "Fiyat yüksek");

        // Assert
        result.Should().BeTrue();

        var updatedOffer = await _context.Offers.FindAsync(offer.Id);
        updatedOffer!.Status.Should().Be(OfferStatus.Rejected);
    }

    [Fact]
    public async Task GetOffersForNeedAsync_ShouldReturnOffersForSpecificNeed()
    {
        // Arrange
        var offer1 = new Offer
        {
            NeedId = 1,
            ProviderId = "provider-id",
            Price = 22000,
            Description = "Offer 1",
            DeliveryDays = 1,
            Status = OfferStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        var offer2 = new Offer
        {
            NeedId = 1,
            ProviderId = "provider-id",
            Price = 23000,
            Description = "Offer 2",
            DeliveryDays = 2,
            Status = OfferStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Offers.AddRange(offer1, offer2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _offerService.GetOffersForNeedAsync(1);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(2);
        result.Items.Should().Contain(o => o.Description == "Offer 1");
        result.Items.Should().Contain(o => o.Description == "Offer 2");
    }

    [Fact]
    public async Task CanProviderCreateOfferAsync_WithValidProvider_ShouldReturnTrue()
    {
        // Act
        var result = await _offerService.CanProviderCreateOfferAsync(1, "provider-id");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanProviderCreateOfferAsync_WhenProviderIsBuyer_ShouldReturnFalse()
    {
        // Act
        var result = await _offerService.CanProviderCreateOfferAsync(1, "buyer-id");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task GetOfferStatsForNeedAsync_ShouldReturnCorrectStats()
    {
        // Arrange
        var offers = new[]
        {
            new Offer
            {
                NeedId = 1,
                ProviderId = "provider-id",
                Price = 20000,
                Description = "Offer 1",
                DeliveryDays = 1,
                Status = OfferStatus.Pending,
                CreatedAt = DateTime.UtcNow
            },
            new Offer
            {
                NeedId = 1,
                ProviderId = "provider-id",
                Price = 25000,
                Description = "Offer 2",
                DeliveryDays = 2,
                Status = OfferStatus.Accepted,
                CreatedAt = DateTime.UtcNow
            }
        };

        _context.Offers.AddRange(offers);
        await _context.SaveChangesAsync();

        // Act
        var result = await _offerService.GetOfferStatsForNeedAsync(1);

        // Assert
        result.Should().NotBeNull();
        result.TotalOffers.Should().Be(2);
        result.PendingOffers.Should().Be(1);
        result.AcceptedOffers.Should().Be(1);
        result.AveragePrice.Should().Be(22500);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}