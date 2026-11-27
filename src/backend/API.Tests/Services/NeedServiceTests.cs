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

    private static CreateNeedRequest UrgentRequest(string title) => new()
    {
        Title = title,
        Description = "Test description for urgent showcase",
        CategoryId = 1,
        Urgency = UrgencyLevel.Urgent
    };

    [Fact]
    public async Task CreateNeedAsync_Urgent_ShouldGetSevenDayShowcaseSlot()
    {
        var result = await _needService.CreateNeedAsync(UrgentRequest("Urgent one"), "test-user-id");

        result.Urgency.Should().Be(UrgencyLevel.Urgent);
        result.UrgentUntil.Should().BeCloseTo(DateTime.UtcNow.AddDays(7), TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task CreateNeedAsync_SecondUrgentForSameUser_ShouldBeRejected()
    {
        await _needService.CreateNeedAsync(UrgentRequest("Urgent one"), "test-user-id");

        var act = () => _needService.CreateNeedAsync(UrgentRequest("Urgent two"), "test-user-id");

        await act.Should().ThrowAsync<API.Middleware.BusinessException>();
    }

    [Fact]
    public async Task UpdateNeedAsync_ToUrgent_ShouldRespectOneSlotRule_AndClearSlotWhenDowngraded()
    {
        var first = await _needService.CreateNeedAsync(UrgentRequest("Urgent one"), "test-user-id");
        var normal = UrgentRequest("Normal one");
        normal.Urgency = UrgencyLevel.Normal;
        var second = await _needService.CreateNeedAsync(normal, "test-user-id");

        var act = () => _needService.UpdateNeedAsync(second.Id, new UpdateNeedRequest { Urgency = UrgencyLevel.Urgent }, "test-user-id");
        await act.Should().ThrowAsync<API.Middleware.BusinessException>();

        var downgraded = await _needService.UpdateNeedAsync(first.Id, new UpdateNeedRequest { Urgency = UrgencyLevel.Normal }, "test-user-id");
        downgraded!.UrgentUntil.Should().BeNull();

        var upgraded = await _needService.UpdateNeedAsync(second.Id, new UpdateNeedRequest { Urgency = UrgencyLevel.Urgent }, "test-user-id");
        upgraded!.UrgentUntil.Should().NotBeNull();
    }

    [Fact]
    public async Task ExpireUrgentShowcasesAsync_ShouldDropEndedSlotsToNormal_AndFreeTheSlot()
    {
        var created = await _needService.CreateNeedAsync(UrgentRequest("Urgent one"), "test-user-id");
        var entity = await _context.Needs.FindAsync(created.Id);
        entity!.UrgentUntil = DateTime.UtcNow.AddMinutes(-1);
        await _context.SaveChangesAsync();

        var count = await _needService.ExpireUrgentShowcasesAsync();

        count.Should().Be(1);
        entity.Urgency.Should().Be(UrgencyLevel.Normal);
        entity.UrgentUntil.Should().BeNull();
        var next = await _needService.CreateNeedAsync(UrgentRequest("Urgent two"), "test-user-id");
        next.Urgency.Should().Be(UrgencyLevel.Urgent);
    }

    [Fact]
    public async Task GetNeedsAsync_DefaultSort_ShouldPinShowcasedUrgentNeedsFirst()
    {
        var urgent = await _needService.CreateNeedAsync(UrgentRequest("Older urgent need"), "test-user-id");
        var normal = UrgentRequest("Newer normal need");
        normal.Urgency = UrgencyLevel.Normal;
        var newer = await _needService.CreateNeedAsync(normal, "test-user-id");
        (await _context.Needs.FindAsync(newer.Id))!.CreatedAt = DateTime.UtcNow.AddMinutes(5);
        await _context.SaveChangesAsync();

        var result = await _needService.GetNeedsAsync(new NeedFilterRequest());

        result.Items.Select(n => n.Id).Should().ContainInOrder(urgent.Id, newer.Id);
    }

    [Fact]
    public async Task UpdateNeedAsync_ReopeningCancelledUrgentNeed_ShouldNotCreateSecondSlot()
    {
        var first = await _needService.CreateNeedAsync(UrgentRequest("Urgent one"), "test-user-id");
        await _needService.UpdateNeedAsync(first.Id, new UpdateNeedRequest { Status = NeedStatus.Cancelled }, "test-user-id");
        await _needService.CreateNeedAsync(UrgentRequest("Urgent two"), "test-user-id");

        var act = () => _needService.UpdateNeedAsync(first.Id, new UpdateNeedRequest { Status = NeedStatus.Active }, "test-user-id");

        await act.Should().ThrowAsync<API.Middleware.BusinessException>();
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
            IsFixedPrice = true,
            MaxBudget = 20000
        };

        // Act
        var result = await _needService.UpdateNeedAsync(need.Id, updateRequest, "test-user-id");

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be(updateRequest.Title);
        result.Description.Should().Be(updateRequest.Description);
        result.IsFixedPrice.Should().BeTrue();
        result.MinBudget.Should().BeNull();
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

    [Fact]
    public async Task GetNeedsAsync_FilteringByRootCategory_IncludesSubcategoryNeeds()
    {
        _context.Categories.AddRange(
            new Category { Id = 50, Name = "Baby", NameTr = "Bebek", ParentCategoryId = 1, IsActive = true },
            new Category { Id = 60, Name = "Other root", NameTr = "Diğer", IsActive = true });
        _context.Needs.AddRange(
            new Need { Title = "Kökte ilan", Description = "Kök kategoride", CategoryId = 1, UserId = "test-user-id", Status = NeedStatus.Active },
            new Need { Title = "Alt kategoride ilan", Description = "Alt kategoride", CategoryId = 50, UserId = "test-user-id", Status = NeedStatus.Active },
            new Need { Title = "Başka kökte ilan", Description = "Başka kategoride", CategoryId = 60, UserId = "test-user-id", Status = NeedStatus.Active });
        await _context.SaveChangesAsync();

        var byRoot = await _needService.GetNeedsAsync(new NeedFilterRequest { CategoryId = 1 });
        var bySub = await _needService.GetNeedsAsync(new NeedFilterRequest { CategoryId = 50 });

        byRoot.Items.Select(n => n.Title).Should().BeEquivalentTo(new[] { "Kökte ilan", "Alt kategoride ilan" });
        bySub.Items.Select(n => n.Title).Should().BeEquivalentTo(new[] { "Alt kategoride ilan" });
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}