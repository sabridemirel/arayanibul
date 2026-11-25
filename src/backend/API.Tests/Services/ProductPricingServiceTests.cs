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

public class ProductPricingServiceTests : IDisposable
{
    private const string Slug = "rtx-3080";
    private readonly ApplicationDbContext _context;
    private readonly ProductPricingService _service;

    public ProductPricingServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ProductPricing:ListingDays"] = "14",
                ["ProductPricing:ResponseDays"] = "7",
                ["ProductPricing:DefaultCeilingPrice"] = "100000"
            })
            .Build();
        var offerService = new OfferService(_context, new Mock<IFileStorageService>().Object, new Mock<INotificationService>().Object);
        _service = new ProductPricingService(_context, offerService, configuration, NullLogger<ProductPricingService>.Instance);

        _context.Categories.Add(new Category { Id = 10, Name = "Computer Components", NameTr = "Bilgisayar Parçaları", ParentCategoryId = 1, IsActive = true });
        _context.Products.AddRange(
            new Product { Id = 1, Name = "RTX 3080", Slug = Slug, CategoryId = 10, Aliases = "rtx 3080|geforce 3080|3080", CeilingPrice = 30000 },
            new Product { Id = 2, Name = "RTX 3080 Ti", Slug = "rtx-3080-ti", CategoryId = 10, Aliases = "rtx 3080 ti|geforce 3080 ti|3080 ti" },
            new Product { Id = 3, Name = "RX 6700 XT", Slug = "rx-6700-xt", CategoryId = 10, Aliases = "rx 6700 xt|radeon 6700 xt|6700 xt" });
        foreach (var id in new[] { "ayse", "bora", "cem", "seller", "seller2" })
        {
            _context.Users.Add(new ApplicationUser { Id = id, UserName = id, Email = $"{id}@example.test", FirstName = id, LastName = "Test" });
        }
        _context.SaveChanges();
    }

    private Task<ProductBidResponse> Bid(string userId, decimal? price, string? address = null)
        => _service.PlaceBidAsync(Slug, userId, new ProductBidRequest { Price = price, Address = address });

    // ---------------- recognising products

    [Theory]
    [InlineData("ikinci el rtx 3080 arıyorum", "RTX 3080")]
    [InlineData("RTX3080 lazım", "RTX 3080")]
    [InlineData("3080 ti alınır", "RTX 3080 Ti")]          // the longer name wins
    [InlineData("rtx 3080ti 12 gb", "RTX 3080 Ti")]
    [InlineData("Radeon 6700XT", "RX 6700 XT")]
    [InlineData("rtx 30800", null)]                        // a longer number is something else
    [InlineData("çekme karavan", null)]
    public async Task FindProductInText(string text, string? expectedName)
    {
        (await _service.FindProductInTextAsync(text))?.Name.Should().Be(expectedName);
    }

    // ---------------- price, rank, suggestions

    [Fact]
    public async Task RealPrice_IsTheHighestLivePrice_AndUnpricedListingsOnlyCountAsSeekers()
    {
        await Bid("ayse", 14000, "İzmir");
        await Bid("bora", 15000);
        await Bid("cem", null);

        var page = (await _service.GetPageAsync(Slug, null))!;

        page.RealPrice.Should().Be(15000);
        page.SeekerCount.Should().Be(3);
        page.Seekers.Select(s => s.Price).Should().Equal(15000, 14000, null);
        page.SuggestedPrices.Should().Equal(15000, 15400);   // top, and one step (2.5% in whole hundreds) above
        page.MyListing.Should().BeNull();
    }

    [Fact]
    public async Task NoPriceYet_ShowsNoNumber()
    {
        await Bid("cem", null);

        var page = (await _service.GetPageAsync(Slug, null))!;

        page.RealPrice.Should().BeNull();
        page.SeekerCount.Should().Be(1);
        page.SuggestedPrices.Should().BeEmpty();
    }

    [Fact]
    public async Task Buyer_SeesRankAndPriceNeededToLead()
    {
        await Bid("ayse", 15000);
        await Bid("bora", 14000);

        var bora = (await _service.GetPageAsync(Slug, "bora"))!.MyListing!;
        var ayse = (await _service.GetPageAsync(Slug, "ayse"))!.MyListing!;

        bora.Rank.Should().Be(2);
        bora.PriceToLead.Should().Be(15400);
        ayse.Rank.Should().Be(1);
        ayse.PriceToLead.Should().BeNull();
    }

    [Fact]
    public async Task OneListingPerBuyer_ANewPriceUpdatesAndRenewsIt()
    {
        var first = await Bid("ayse", 14000);
        var second = await Bid("ayse", 16000);

        second.NeedId.Should().Be(first.NeedId);
        (await _context.Needs.CountAsync(n => n.UserId == "ayse")).Should().Be(1);
        var need = await _context.Needs.SingleAsync(n => n.UserId == "ayse");
        need.MaxBudget.Should().Be(16000);
        need.MinBudget.Should().BeNull();
        need.ProductId.Should().Be(1);
        need.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddDays(14), TimeSpan.FromMinutes(1));
        need.Status.Should().Be(NeedStatus.Active);
    }

    [Fact]
    public async Task PriceAboveCeiling_IsRefused()
    {
        var act = () => Bid("ayse", 30001);

        (await act.Should().ThrowAsync<BusinessException>()).Which.Message.Should().Contain("30.000");
        (await _context.Needs.AnyAsync()).Should().BeFalse();
    }

    [Fact]
    public async Task EditingAProductListingElsewhere_CannotBreakCeilingOrCategory()
    {
        var bid = await Bid("ayse", 14000);
        var need = await _context.Needs.SingleAsync(n => n.Id == bid.NeedId);

        var tooHigh = () => _service.EnsureEditAllowedAsync(need, new UpdateNeedRequest { MaxBudget = 99999 });
        var otherCategory = () => _service.EnsureEditAllowedAsync(need, new UpdateNeedRequest { CategoryId = 99 });

        await tooHigh.Should().ThrowAsync<BusinessException>();
        await otherCategory.Should().ThrowAsync<BusinessException>();
        await _service.EnsureEditAllowedAsync(need, new UpdateNeedRequest { MaxBudget = 20000 });
    }

    // ---------------- selling at the listed price

    [Fact]
    public async Task Sell_OffersTheTopBuyerTheirOwnPrice()
    {
        await Bid("ayse", 14000);
        var top = await Bid("bora", 15000);

        var result = await _service.SellAtRealPriceAsync(Slug, "seller");

        result.NeedId.Should().Be(top.NeedId);
        result.Price.Should().Be(15000);
        var offer = await _context.Offers.SingleAsync();
        offer.AtListedPrice.Should().BeTrue();
        offer.Price.Should().Be(15000);
        offer.Status.Should().Be(OfferStatus.Pending);
        offer.Description.Length.Should().BeGreaterThanOrEqualTo(50);

        var page = (await _service.GetPageAsync(Slug, null))!;
        page.RealPrice.Should().Be(15000);                       // the price stays on the page...
        page.Seekers[0].AwaitingBuyerResponse.Should().BeTrue(); // ...marked as waiting for the buyer
    }

    [Fact]
    public async Task Sell_SkipsOwnListing_BlockedBuyers_AndListingsAlreadyOffered()
    {
        await Bid("seller", 20000);               // the seller's own listing leads
        await Bid("ayse", 18000);                 // blocked with the seller
        var bora = await Bid("bora", 16000);
        var cem = await Bid("cem", 15000);
        _context.UserBlocks.Add(new UserBlock { BlockerId = "ayse", BlockedId = "seller" });
        await _context.SaveChangesAsync();

        var before = (await _service.GetPageAsync(Slug, "seller"))!.SellTarget!;
        before.NeedId.Should().Be(bora.NeedId);
        before.Price.Should().Be(16000);
        before.IsTopPrice.Should().BeFalse();

        (await _service.SellAtRealPriceAsync(Slug, "seller")).NeedId.Should().Be(bora.NeedId);
        (await _service.SellAtRealPriceAsync(Slug, "seller")).NeedId.Should().Be(cem.NeedId);   // next in line

        var nobodyLeft = () => _service.SellAtRealPriceAsync(Slug, "seller");
        await nobodyLeft.Should().ThrowAsync<BusinessException>();
    }

    [Fact]
    public async Task SecondSeller_CanStillOfferTheSameListing()
    {
        var top = await Bid("ayse", 15000);

        await _service.SellAtRealPriceAsync(Slug, "seller");
        var second = await _service.SellAtRealPriceAsync(Slug, "seller2");

        second.NeedId.Should().Be(top.NeedId);
        (await _context.Offers.CountAsync(o => o.NeedId == top.NeedId)).Should().Be(2);
    }

    // ---------------- housekeeping

    [Fact]
    public async Task UnansweredAtPriceOffer_ClosesTheListing_AndThePriceMovesOn()
    {
        var top = await Bid("ayse", 15000);
        await Bid("bora", 14000);
        await _service.SellAtRealPriceAsync(Slug, "seller");

        (await _service.CloseStaleListingsAsync()).Should().Be(0);   // still inside the response window

        var offer = await _context.Offers.SingleAsync();
        offer.CreatedAt = DateTime.UtcNow.AddDays(-8);
        await _context.SaveChangesAsync();

        (await _service.CloseStaleListingsAsync()).Should().Be(1);
        (await _service.CloseStaleListingsAsync()).Should().Be(0);   // nothing is closed twice

        (await _context.Needs.SingleAsync(n => n.Id == top.NeedId)).Status.Should().Be(NeedStatus.Expired);
        (await _context.Offers.SingleAsync()).Status.Should().Be(OfferStatus.Rejected);
        (await _service.GetPageAsync(Slug, null))!.RealPrice.Should().Be(14000);
        (await _context.Notifications.Select(n => n.UserId).ToListAsync()).Should().BeEquivalentTo(new[] { "seller", "ayse" });
    }

    [Fact]
    public async Task ListingPastItsEndDate_StopsCounting_AndCanBeRenewed()
    {
        var bid = await Bid("ayse", 15000);
        var need = await _context.Needs.SingleAsync(n => n.Id == bid.NeedId);
        need.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        await _context.SaveChangesAsync();

        (await _service.GetPageAsync(Slug, null))!.RealPrice.Should().BeNull();   // already ignored before the job runs
        (await _service.CloseStaleListingsAsync()).Should().Be(1);
        (await _context.Needs.SingleAsync()).Status.Should().Be(NeedStatus.Expired);

        var renewed = await Bid("ayse", 15000);

        renewed.NeedId.Should().Be(bid.NeedId);
        (await _service.GetPageAsync(Slug, null))!.RealPrice.Should().Be(15000);
    }

    [Fact]
    public async Task RecentDeals_ComeFromAcceptedOffers()
    {
        var bid = await Bid("ayse", 15000);
        var sold = await _service.SellAtRealPriceAsync(Slug, "seller");
        var offer = await _context.Offers.SingleAsync(o => o.Id == sold.OfferId);
        offer.Status = OfferStatus.Accepted;
        (await _context.Needs.SingleAsync(n => n.Id == bid.NeedId)).Status = NeedStatus.InProgress;
        await _context.SaveChangesAsync();

        var page = (await _service.GetPageAsync(Slug, null))!;

        page.RecentDeals.Should().ContainSingle().Which.Price.Should().Be(15000);
        page.RealPrice.Should().BeNull();           // the agreed listing no longer counts as a live price
        page.SuggestedPrices.Should().Equal(15000); // but the last deal guides the next buyer
    }

    public void Dispose() => _context.Dispose();
}
