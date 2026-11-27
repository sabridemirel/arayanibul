using API.Data;
using API.Interfaces;
using API.Middleware;
using API.Models;
using API.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace API.Tests.Services;

/// <summary>Listings whose words point to an unrelated category ("kiralık ev" under computer parts).</summary>
public class CategoryMismatchTests : IDisposable
{
    private const string UserId = "user-1";
    private readonly ApplicationDbContext _context;
    private readonly NeedService _needs;
    private readonly AdminService _admin;

    public CategoryMismatchTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);
        // The real category tree, as in production
        SeedData.SeedCategoriesAsync(_context).GetAwaiter().GetResult();
        SeedData.EnsureFocusCategoriesAsync(_context).GetAwaiter().GetResult();
        _context.Users.Add(new ApplicationUser { Id = UserId, UserName = "u", Email = "u@test.arayanibul.local", FirstName = "U", LastName = "One" });
        _context.SaveChanges();

        var moderation = new Mock<IContentModerationService>();
        moderation.SetupGet(m => m.IsEnabled).Returns(true);
        moderation.SetupGet(m => m.AutoApproveClean).Returns(true);
        moderation.Setup(m => m.FindFlaggedTermsAsync(It.IsAny<string?>(), It.IsAny<string?>())).ReturnsAsync(new List<string>());
        _needs = new NeedService(_context, new Mock<IFileStorageService>().Object, moderation.Object);

        var userManager = new Mock<UserManager<ApplicationUser>>(
            Mock.Of<IUserStore<ApplicationUser>>(), null!, null!, null!, null!, null!, null!, null!, null!);
        _admin = new AdminService(_context, userManager.Object, new Mock<IEmailService>().Object,
            new MemoryCache(new MemoryCacheOptions()), new ConfigurationBuilder().Build(), NullLogger<AdminService>.Instance);
    }

    private int Cat(string englishName) => _context.Categories.Single(c => c.Name == englishName).Id;

    private Task<CategoryCheckResponse> Check(string title, string description, string category)
        => _needs.CheckCategoryAsync(new CategoryCheckRequest { Title = title, Description = description, CategoryId = Cat(category) });

    [Theory]
    [InlineData("Kiralık ev arıyorum", "Kadıköy'de 2+1 kiralık ev arıyorum.", "Computer Components", "Houses")]
    [InlineData("Çekme karavan", "Temiz bir çekme karavan arıyorum.", "Mobile Phones", "Caravans & Trailers")]
    [InlineData("Bebek arabası", "İkinci el temiz bir bebek arabası arıyorum.", "Cars", "Baby Products")]
    [InlineData("Ev temizliği", "Haftada bir ev temizliği yapacak birini arıyorum.", "Computer Components", "Cleaning Services")]
    public async Task UnrelatedCategory_IsCaught_WithASuggestion(string title, string description, string chosen, string suggested)
    {
        var result = await Check(title, description, chosen);

        result.Matches.Should().BeFalse();
        result.SuggestedCategoryId.Should().Be(Cat(suggested));
        result.SuggestedCategoryName.Should().NotBeNullOrEmpty();
    }

    [Theory]
    // Words from the same group, or one fitting word among others, are fine
    [InlineData("RTX 3080 arıyorum", "Çalışır durumda ekran kartı.", "Computer Components")]
    [InlineData("Ekran kartı", "Oyun bilgisayarım için ekran kartı.", "Computers & Laptops")]
    [InlineData("Bilgisayar masası", "Geniş bir bilgisayar masası arıyorum.", "Furniture")]
    [InlineData("Kamp çadırı", "4 kişilik kamp çadırı.", "Tents & Sleeping Gear")]
    [InlineData("Karavan için güneş paneli", "Çekme karavanıma güneş paneli.", "Caravan Equipment")]
    // Text that names no category says nothing about the choice
    [InlineData("Yardım lazım", "Hafta sonu için bir şey arıyorum.", "Computer Components")]
    public async Task FittingOrNeutralText_IsNotFlagged(string title, string description, string chosen)
    {
        (await Check(title, description, chosen)).Matches.Should().BeTrue();
    }

    [Fact]
    public async Task MismatchedListing_WaitsForReview_WithTheSuggestion()
    {
        var need = await _needs.CreateNeedAsync(new CreateNeedRequest
        {
            Title = "Kiralık ev arıyorum",
            Description = "Kadıköy'de 2+1 kiralık ev arıyorum.",
            CategoryId = Cat("Computer Components")
        }, UserId);

        need.Status.Should().Be(NeedStatus.PendingReview);
        (await _context.Needs.SingleAsync()).SuggestedCategoryId.Should().Be(Cat("Houses"));
    }

    [Fact]
    public async Task FittingListing_StillGoesLiveAtOnce()
    {
        var need = await _needs.CreateNeedAsync(new CreateNeedRequest
        {
            Title = "Kiralık ev arıyorum",
            Description = "Kadıköy'de 2+1 kiralık ev arıyorum.",
            CategoryId = Cat("Houses")
        }, UserId);

        need.Status.Should().Be(NeedStatus.Active);
        (await _context.Needs.SingleAsync()).SuggestedCategoryId.Should().BeNull();
    }

    [Fact]
    public async Task EditingALiveListingIntoAnotherTopic_SendsItToReview()
    {
        var need = await _needs.CreateNeedAsync(new CreateNeedRequest
        {
            Title = "RTX 3080 arıyorum",
            Description = "Çalışır durumda ekran kartı arıyorum.",
            CategoryId = Cat("Computer Components")
        }, UserId);
        need.Status.Should().Be(NeedStatus.Active);

        var edited = await _needs.UpdateNeedAsync(need.Id, new UpdateNeedRequest
        {
            Title = "Kiralık ev arıyorum",
            Description = "Kadıköy'de 2+1 kiralık ev arıyorum."
        }, UserId);

        edited!.Status.Should().Be(NeedStatus.PendingReview);
    }

    [Fact]
    public async Task Admin_CanApproveUnderTheSuggestedCategory()
    {
        var need = await _needs.CreateNeedAsync(new CreateNeedRequest
        {
            Title = "Kiralık ev arıyorum",
            Description = "Kadıköy'de 2+1 kiralık ev arıyorum.",
            CategoryId = Cat("Computer Components")
        }, UserId);

        var queue = await _admin.GetNeedsAsync(NeedStatus.PendingReview, null, flaggedOnly: true, 1, 20);
        var item = queue.Items.Single();
        item.SuggestedCategoryId.Should().Be(Cat("Houses"));
        item.SuggestedCategoryName.Should().NotBeNullOrEmpty();

        await _admin.ApproveNeedAsync(need.Id, "admin", item.SuggestedCategoryId);

        var stored = await _context.Needs.SingleAsync();
        stored.Status.Should().Be(NeedStatus.Active);
        stored.CategoryId.Should().Be(Cat("Houses"));
        stored.SuggestedCategoryId.Should().BeNull();
    }

    [Fact]
    public async Task Admin_CanMoveAPendingListingToAnyCategory_WithoutApproving()
    {
        var need = await _needs.CreateNeedAsync(new CreateNeedRequest
        {
            Title = "Kiralık ev arıyorum",
            Description = "Kadıköy'de 2+1 kiralık ev arıyorum.",
            CategoryId = Cat("Computer Components")
        }, UserId);

        var item = await _admin.ChangeNeedCategoryAsync(need.Id, Cat("Apartments"));

        item.CategoryId.Should().Be(Cat("Apartments"));
        item.Status.Should().Be(NeedStatus.PendingReview); // still waiting for a decision
        item.SuggestedCategoryId.Should().BeNull();

        var invalid = () => _admin.ChangeNeedCategoryAsync(need.Id, 999999);
        await invalid.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task PendingListing_IsOnlyVisibleToItsOwner()
    {
        var need = await _needs.CreateNeedAsync(new CreateNeedRequest
        {
            Title = "Kiralık ev arıyorum",
            Description = "Kadıköy'de 2+1 kiralık ev arıyorum.",
            CategoryId = Cat("Computer Components")
        }, UserId);

        (await _needs.GetUserNeedsAsync(UserId, ownerView: true)).Items.Should().ContainSingle(n => n.Id == need.Id);
        (await _needs.GetUserNeedsAsync(UserId)).Items.Should().NotContain(n => n.Id == need.Id);
        (await _needs.GetNeedsAsync(new NeedFilterRequest { PageSize = 100 })).Items.Should().NotContain(n => n.Id == need.Id);
    }

    [Fact]
    public async Task Admin_CanRejectForWrongCategory()
    {
        var need = await _needs.CreateNeedAsync(new CreateNeedRequest
        {
            Title = "Kiralık ev arıyorum",
            Description = "Kadıköy'de 2+1 kiralık ev arıyorum.",
            CategoryId = Cat("Computer Components")
        }, UserId);

        var rejected = await _admin.RejectNeedAsync(need.Id, NeedRejectionReason.WrongCategory, null, "admin", takeDown: false);

        rejected.RejectionReasonText.Should().Be("Yanlış kategori");
    }

    public void Dispose() => _context.Dispose();
}
