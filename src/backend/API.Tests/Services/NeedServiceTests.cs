using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Moq;
using FluentAssertions;
using API.Services;
using API.Models;
using API.Data;
using API.Interfaces;

namespace API.Tests.Services;

public class NeedServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IFileStorageService> _fileStorageServiceMock;
    private readonly NeedService _needService;

    public NeedServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup mocks
        _fileStorageServiceMock = new Mock<IFileStorageService>();

        _needService = new NeedService(_context, _fileStorageServiceMock.Object);

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

        var user = new ApplicationUser
        {
            Id = "test-user-id",
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User"
        };

        _context.Categories.Add(category);
        _context.Users.Add(user);
        _context.SaveChanges();
    }

    [Fact]
    public async Task CreateNeedAsync_WithValidData_ShouldCreateNeed()
    {
        // Arrange
        var request = new CreateNeedRequest
        {
            Title = "iPhone 13 Pro arıyorum",
            Description = "Temiz durumda iPhone 13 Pro arıyorum",
            CategoryId = 1,
            MinBudget = 20000,
            MaxBudget = 25000,
            Urgency = UrgencyLevel.Normal,
            Latitude = 41.0082,
            Longitude = 28.9784,
            Address = "İstanbul, Türkiye"
        };

        var userId = "test-user-id";

        // Act
        var result = await _needService.CreateNeedAsync(request, userId);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be(request.Title);
        result.Description.Should().Be(request.Description);
        result.CategoryId.Should().Be(request.CategoryId);
        result.Status.Should().Be(NeedStatus.Active);

        var needInDb = await _context.Needs.FirstOrDefaultAsync(n => n.Title == request.Title);
        needInDb.Should().NotBeNull();
    }

    [Fact]
    public async Task GetNeedByIdAsync_WithExistingId_ShouldReturnNeed()
    {
        // Arrange
        var need = new Need
        {
            Title = "Test Need",
            Description = "Test Description",
            CategoryId = 1,
            UserId = "test-user-id",
            Status = NeedStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        _context.Needs.Add(need);
        await _context.SaveChangesAsync();

        // Act
        var result = await _needService.GetNeedByIdAsync(need.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be(need.Title);
        result.Description.Should().Be(need.Description);
    }

    [Fact]
    public async Task GetNeedByIdAsync_WithNonExistingId_ShouldReturnNull()
    {
        // Act
        var result = await _needService.GetNeedByIdAsync(999);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateNeedAsync_WithValidData_ShouldUpdateNeed()
    {
        // Arrange
        var need = new Need
        {
            Title = "Original Title",
            Description = "Original Description",
            CategoryId = 1,
            UserId = "test-user-id",
            Status = NeedStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        _context.Needs.Add(need);
        await _context.SaveChangesAsync();

        var updateRequest = new UpdateNeedRequest
        {
            Title = "Updated Title",
            Description = "Updated Description",
            MinBudget = 15000,
            MaxBudget = 20000
        };

        // Act
        var result = await _needService.UpdateNeedAsync(need.Id, updateRequest, "test-user-id");

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be(updateRequest.Title);
        result.Description.Should().Be(updateRequest.Description);
        result.MinBudget.Should().Be(updateRequest.MinBudget);
        result.MaxBudget.Should().Be(updateRequest.MaxBudget);
    }

    [Fact]
    public async Task DeleteNeedAsync_WithValidId_ShouldDeleteNeed()
    {
        // Arrange
        var need = new Need
        {
            Title = "Need to Delete",
            Description = "Description",
            CategoryId = 1,
            UserId = "test-user-id",
            Status = NeedStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        _context.Needs.Add(need);
        await _context.SaveChangesAsync();

        // Act
        var result = await _needService.DeleteNeedAsync(need.Id, "test-user-id");

        // Assert
        result.Should().BeTrue();

        var deletedNeed = await _context.Needs.FindAsync(need.Id);
        deletedNeed.Should().BeNull();
    }

    [Fact]
    public async Task GetNearbyNeedsAsync_ShouldReturnNeedsWithinRadius()
    {
        // Arrange
        var nearNeed = new Need
        {
            Title = "Near Need",
            Description = "Description",
            CategoryId = 1,
            UserId = "test-user-id",
            Status = NeedStatus.Active,
            Latitude = 41.0082,
            Longitude = 28.9784,
            CreatedAt = DateTime.UtcNow
        };

        var farNeed = new Need
        {
            Title = "Far Need",
            Description = "Description",
            CategoryId = 1,
            UserId = "test-user-id",
            Status = NeedStatus.Active,
            Latitude = 42.0082,
            Longitude = 30.9784,
            CreatedAt = DateTime.UtcNow
        };

        _context.Needs.AddRange(nearNeed, farNeed);
        await _context.SaveChangesAsync();

        // Act
        var result = await _needService.GetNearbyNeedsAsync(41.0082, 28.9784, 10);

        // Assert
        result.Should().NotBeEmpty();
        result.Should().Contain(n => n.Title == "Near Need");
        // Note: Distance calculation in tests might be approximate
    }

    [Fact]
    public async Task SearchNeedsAsync_WithSearchText_ShouldReturnMatchingNeeds()
    {
        // Arrange
        var need1 = new Need
        {
            Title = "iPhone 13 Pro arıyorum",
            Description = "Temiz iPhone lazım",
            CategoryId = 1,
            UserId = "test-user-id",
            Status = NeedStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        var need2 = new Need
        {
            Title = "Samsung Galaxy arıyorum",
            Description = "Android telefon lazım",
            CategoryId = 1,
            UserId = "test-user-id",
            Status = NeedStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        _context.Needs.AddRange(need1, need2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _needService.SearchNeedsAsync("iPhone");

        // Assert
        result.Should().NotBeEmpty();
        result.Should().Contain(n => n.Title.Contains("iPhone"));
        result.Should().NotContain(n => n.Title.Contains("Samsung"));
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}