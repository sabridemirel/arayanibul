using API.Data;
using API.Interfaces;
using API.Middleware;
using API.Models;
using API.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace API.Tests.Services;

public class CategoryFollowServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IEmailService> _email = new();
    private readonly CategoryFollowService _service;

    public CategoryFollowServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["App:WebBaseUrl"] = "https://example.test",
                ["NewNeedAlerts:MaxEmailsPerDay"] = "2"
            })
            .Build();
        _email.Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);
        _service = new CategoryFollowService(_context, _email.Object, configuration, NullLogger<CategoryFollowService>.Instance);

        _context.Categories.AddRange(
            new Category { Id = 1, Name = "Electronics", NameTr = "Elektronik", IsActive = true },
            new Category { Id = 10, Name = "Computer Components", NameTr = "Bilgisayar Parçaları", ParentCategoryId = 1, IsActive = true },
            new Category { Id = 2, Name = "Baby & Kids", NameTr = "Bebek & Çocuk", IsActive = true },
            new Category { Id = 3, Name = "Hidden", NameTr = "Gizli", IsActive = false });
        _context.Users.AddRange(
            User("buyer"), User("seller-sub"), User("seller-root"), User("seller-other"),
            User("blocked"), User("guest", isGuest: true), User("no-mail", emails: false));
        _context.SaveChanges();
    }

    private static ApplicationUser User(string id, bool isGuest = false, bool emails = true) => new()
    {
        Id = id, UserName = id, Email = $"{id}@example.test", FirstName = id, LastName = "Test",
        IsGuest = isGuest, EnableNewNeedEmails = emails
    };

    private void Follow(string userId, int categoryId)
        => _context.CategoryFollows.Add(new CategoryFollow { UserId = userId, CategoryId = categoryId });

    private Need AddNeed(string title = "RTX 3080 arıyorum", NeedStatus status = NeedStatus.Active, DateTime? createdAt = null)
    {
        var need = new Need
        {
            Title = title, Description = "Temiz ekran kartı", CategoryId = 10, UserId = "buyer",
            MaxBudget = 15000, Address = "İstanbul", Status = status,
            CreatedAt = createdAt ?? DateTime.UtcNow
        };
        _context.Needs.Add(need);
        _context.SaveChanges();
        return need;
    }

    [Fact]
    public async Task SetFollows_ReplacesTheSet_IgnoresUnknownAndInactive_AndStoresEmailPreference()
    {
        await _service.SetFollowsAsync("seller-sub", new CategoryFollowsRequest { CategoryIds = { 1, 10 } });

        var result = await _service.SetFollowsAsync("seller-sub",
            new CategoryFollowsRequest { CategoryIds = { 10, 2, 3, 999 }, EmailEnabled = false });

        result.CategoryIds.Should().BeEquivalentTo(new[] { 2, 10 });
        result.EmailEnabled.Should().BeFalse();
        (await _context.CategoryFollows.CountAsync(f => f.UserId == "seller-sub")).Should().Be(2);
    }

    [Fact]
    public async Task SetFollows_RejectsTooManyCategories()
    {
        var request = new CategoryFollowsRequest
        {
            CategoryIds = Enumerable.Range(1, CategoryFollowService.MaxFollowedCategories + 1).ToList()
        };

        var act = () => _service.SetFollowsAsync("seller-sub", request);

        await act.Should().ThrowAsync<BusinessException>();
    }

    [Fact]
    public async Task NewNeed_NotifiesFollowersOfCategoryAndItsParent_ButNotOthers()
    {
        Follow("seller-sub", 10);
        Follow("seller-root", 1);
        Follow("seller-other", 2);
        Follow("buyer", 10);          // the owner is not told about their own listing
        Follow("guest", 10);
        Follow("blocked", 10);
        _context.UserBlocks.Add(new UserBlock { BlockerId = "buyer", BlockedId = "blocked" });
        var need = AddNeed();

        var announced = await _service.NotifyFollowersOfNewNeedsAsync();

        announced.Should().Be(1);
        var notified = await _context.Notifications.Where(n => n.Type == "new_need").ToListAsync();
        notified.Select(n => n.UserId).Should().BeEquivalentTo(new[] { "seller-sub", "seller-root" });
        notified[0].Title.Should().Be("Yeni ilan: RTX 3080 arıyorum");
        notified[0].Body.Should().Contain("Bilgisayar Parçaları · En fazla 15.000 TL · İstanbul");
        notified[0].Data.Should().Contain($"\"needId\":{need.Id}");
        _email.Verify(e => e.SendEmailAsync("seller-sub@example.test", It.IsAny<string>(),
            It.IsAny<string>(), It.Is<string>(text => text.Contains($"https://example.test/needs/{need.Id}"))), Times.Once);
        _email.Verify(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Exactly(2));
    }

    [Fact]
    public async Task EachNeed_IsAnnouncedOnce_AndOnlyWhenLiveAndRecent()
    {
        Follow("seller-sub", 10);
        AddNeed("Yayında ilan");
        AddNeed("İncelemede ilan", NeedStatus.PendingReview);
        AddNeed("Eski ilan", createdAt: DateTime.UtcNow.AddDays(-3));

        (await _service.NotifyFollowersOfNewNeedsAsync()).Should().Be(1);
        (await _service.NotifyFollowersOfNewNeedsAsync()).Should().Be(0);

        (await _context.Notifications.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task ApprovedLater_IsAnnouncedFromItsApprovalTime()
    {
        Follow("seller-sub", 10);
        var need = AddNeed("Sonradan onaylanan", NeedStatus.PendingReview, DateTime.UtcNow.AddDays(-3));
        (await _service.NotifyFollowersOfNewNeedsAsync()).Should().Be(0);

        need.Status = NeedStatus.Active;
        need.ApprovedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        (await _service.NotifyFollowersOfNewNeedsAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Emails_RespectPreferenceAndDailyCap_WhileInAppNotificationsContinue()
    {
        Follow("seller-sub", 10);
        Follow("no-mail", 10);
        AddNeed("İlan 1");
        AddNeed("İlan 2");
        AddNeed("İlan 3");

        await _service.NotifyFollowersOfNewNeedsAsync();

        (await _context.Notifications.CountAsync(n => n.UserId == "seller-sub")).Should().Be(3);
        (await _context.Notifications.CountAsync(n => n.UserId == "no-mail")).Should().Be(3);
        _email.Verify(e => e.SendEmailAsync("seller-sub@example.test", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Exactly(2));
        _email.Verify(e => e.SendEmailAsync("no-mail@example.test", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    public void Dispose() => _context.Dispose();
}
