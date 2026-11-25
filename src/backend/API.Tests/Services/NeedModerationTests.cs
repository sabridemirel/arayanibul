using API.Data;
using API.Interfaces;
using API.Models;
using API.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace API.Tests.Services;

public class NeedModerationTests : IDisposable
{
    private const string UserId = "user-1";
    private const string FlagWord = "yasakli";

    private readonly ApplicationDbContext _context;
    private readonly Mock<IContentModerationService> _moderation = new();
    private readonly NeedService _needService;

    public NeedModerationTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);
        _context.Categories.Add(new Category { Id = 1, Name = "Electronics", NameTr = "Elektronik", IsActive = true });
        _context.Users.Add(new ApplicationUser { Id = UserId, Email = "u@example.test", FirstName = "U", LastName = "One" });
        _context.SaveChanges();

        _moderation.SetupGet(m => m.IsEnabled).Returns(true);
        _moderation.SetupGet(m => m.AutoApproveClean).Returns(true);
        _moderation
            .Setup(m => m.FindFlaggedTermsAsync(It.IsAny<string?>(), It.IsAny<string?>()))
            .ReturnsAsync((string? title, string? description) =>
                $"{title} {description}".Contains(FlagWord) ? new List<string> { FlagWord } : new List<string>());

        _needService = new NeedService(_context, new Mock<IFileStorageService>().Object, _moderation.Object);
    }

    private static CreateNeedRequest Request(string description = "Temiz durumda ekran kartı arıyorum") => new()
    {
        Title = "RTX 3080 arıyorum",
        Description = description,
        CategoryId = 1
    };

    [Fact]
    public async Task CleanListing_GoesLiveImmediately()
    {
        var need = await _needService.CreateNeedAsync(Request(), UserId);

        need.Status.Should().Be(NeedStatus.Active);
        var stored = await _context.Needs.SingleAsync();
        stored.NeedsReview.Should().BeFalse();
        stored.ApprovedAt.Should().NotBeNull();
        stored.ReviewedById.Should().BeNull();
    }

    [Fact]
    public async Task FlaggedListing_WaitsForReview()
    {
        var need = await _needService.CreateNeedAsync(Request($"İçinde {FlagWord} kelime var"), UserId);

        need.Status.Should().Be(NeedStatus.PendingReview);
        (await _context.Needs.SingleAsync()).NeedsReview.Should().BeTrue();
    }

    [Fact]
    public async Task CleanListing_WaitsForReview_WhenAutoApproveIsOff()
    {
        _moderation.SetupGet(m => m.AutoApproveClean).Returns(false);

        var need = await _needService.CreateNeedAsync(Request(), UserId);

        need.Status.Should().Be(NeedStatus.PendingReview);
    }

    [Fact]
    public async Task CleanEditOfLiveListing_StaysLive_ButFlaggedEditGoesToReview()
    {
        var need = await _needService.CreateNeedAsync(Request(), UserId);

        var clean = await _needService.UpdateNeedAsync(
            need.Id, new UpdateNeedRequest { Description = "Kutulu ve garantili olsun lütfen" }, UserId);
        clean!.Status.Should().Be(NeedStatus.Active);

        var flagged = await _needService.UpdateNeedAsync(
            need.Id, new UpdateNeedRequest { Description = $"Şimdi {FlagWord} bir metin" }, UserId);
        flagged!.Status.Should().Be(NeedStatus.PendingReview);
    }

    [Fact]
    public async Task CleanEditOfRejectedListing_StillGoesToReview()
    {
        var need = await _needService.CreateNeedAsync(Request(), UserId);
        var stored = await _context.Needs.SingleAsync();
        stored.Status = NeedStatus.Rejected;
        stored.RejectionReason = NeedRejectionReason.Other;
        await _context.SaveChangesAsync();

        var edited = await _needService.UpdateNeedAsync(
            need.Id, new UpdateNeedRequest { Description = "Tamamen temiz yeni bir açıklama" }, UserId);

        edited!.Status.Should().Be(NeedStatus.PendingReview);
    }

    public void Dispose() => _context.Dispose();
}
