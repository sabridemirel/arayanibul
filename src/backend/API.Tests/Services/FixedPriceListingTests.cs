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

/// <summary>"Bu fiyata hemen alırım" listings: one price, no bargaining.</summary>
public class FixedPriceListingTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly NeedService _needs;
    private readonly OfferService _offers;
    private readonly ProductPricingService _pricing;

    public FixedPriceListingTests()
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
                ["ProductPricing:DefaultCeilingPrice"] = "100000",
                ["FixedPrice:NudgeDays"] = "3"
            })
            .Build();
        _offers = new OfferService(_context, new Mock<IFileStorageService>().Object, new Mock<INotificationService>().Object);
        _pricing = new ProductPricingService(_context, _offers, configuration, NullLogger<ProductPricingService>.Instance);
        _needs = new NeedService(_context, new Mock<IFileStorageService>().Object, productPricing: _pricing);

        _context.Categories.AddRange(
            new Category { Id = 1, Name = "Baby & Kids", NameTr = "Bebek & Çocuk", IsActive = true },
            new Category { Id = 10, Name = "Computer Components", NameTr = "Bilgisayar Parçaları", IsActive = true });
        _context.Products.Add(new Product
        {
            Id = 1, Name = "RTX 3080", Slug = "rtx-3080", CategoryId = 10,
            Aliases = "rtx 3080|geforce 3080|3080", CeilingPrice = 30000
        });
        foreach (var id in new[] { "buyer", "buyer2", "seller", "seller2" })
        {
            _context.Users.Add(new ApplicationUser { Id = id, UserName = id, Email = $"{id}@example.test", FirstName = id, LastName = "Test" });
        }
        _context.SaveChanges();
    }

    private Task<NeedResponse> Create(string title, decimal? price, bool isFixed = true, decimal? min = null, string userId = "buyer")
        => _needs.CreateNeedAsync(new CreateNeedRequest
        {
            Title = title,
            Description = "Temiz, az kullanılmış olsun. Elden teslim tercihimdir.",
            CategoryId = 1,
            MinBudget = min,
            MaxBudget = price,
            IsFixedPrice = isFixed
        }, userId);

    private static CreateOfferRequest OfferAt(int needId, decimal price) => new()
    {
        NeedId = needId,
        Price = price,
        Currency = "TRY",
        Description = "Elimde tam istediğiniz üründen var, kutusu ve faturasıyla birlikte verebilirim.",
        DeliveryDays = 2
    };

    private List<Notification> NotificationsFor(string userId, string type)
        => _context.Notifications.Where(n => n.UserId == userId && n.Type == type).ToList();

    // ---------------- creating

    [Fact]
    public async Task FixedPrice_NeedsAPrice()
    {
        var act = () => Create("Bebek arabası arıyorum", null);
        (await act.Should().ThrowAsync<ValidationException>()).Which.Errors["Budget"][0].Should().Contain("fiyat yazın");
    }

    [Fact]
    public async Task FixedPrice_HasASanityCeiling()
    {
        var act = () => Create("Bebek arabası arıyorum", 270_021_000);
        (await act.Should().ThrowAsync<ValidationException>()).Which.Errors["Budget"][0].Should().Contain("100.000.000");

        var need = await Create("Bebek arabası arıyorum", 3000);
        var edit = () => _needs.UpdateNeedAsync(need.Id, new UpdateNeedRequest { MaxBudget = 200_000_000 }, "buyer");
        await edit.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task FixedPrice_KeepsOnePrice_AndIsNotLinkedWithoutAProduct()
    {
        var need = await Create("Bebek arabası arıyorum", 3000, min: 1000);

        need.IsFixedPrice.Should().BeTrue();
        need.MaxBudget.Should().Be(3000);
        need.MinBudget.Should().BeNull();
        need.ProductSlug.Should().BeNull();
        need.ExpiresAt.Should().BeNull();
    }

    [Fact]
    public async Task OpenListing_CarriesNoPrice_EvenWhenAnOlderAppSendsABudget()
    {
        var need = await Create("RTX 3080 arıyorum", 15000, isFixed: false, min: 12000);

        need.IsFixedPrice.Should().BeFalse();
        need.MinBudget.Should().BeNull();
        need.MaxBudget.Should().BeNull();
        need.ProductSlug.Should().BeNull(); // only firm prices count on a price page
    }

    [Fact]
    public async Task OpenListing_DoesNotTakeABudgetOnEdit_ButAnOldBudgetStays()
    {
        var need = await Create("Bebek arabası arıyorum", null, isFixed: false);
        var stored = await _context.Needs.FindAsync(need.Id);
        stored!.MinBudget = 1000; stored.MaxBudget = 2000; // a listing from before the change
        await _context.SaveChangesAsync();

        var updated = await _needs.UpdateNeedAsync(need.Id, new UpdateNeedRequest { MaxBudget = 5000, Address = "İzmir" }, "buyer");

        updated!.MinBudget.Should().Be(1000);
        updated.MaxBudget.Should().Be(2000);
    }

    [Theory]
    [InlineData(UrgencyLevel.Flexible, UrgencyLevel.Normal)]
    [InlineData(UrgencyLevel.Normal, UrgencyLevel.Normal)]
    [InlineData(UrgencyLevel.Urgent, UrgencyLevel.Urgent)]
    public async Task Urgency_IsEitherNormalOrUrgent(UrgencyLevel sent, UrgencyLevel stored)
    {
        var need = await _needs.CreateNeedAsync(new CreateNeedRequest
        {
            Title = "Bebek arabası arıyorum",
            Description = "Temiz, az kullanılmış olsun. Elden teslim tercihimdir.",
            CategoryId = 1,
            Urgency = sent
        }, "buyer");

        need.Urgency.Should().Be(stored);
    }

    [Fact]
    public async Task FixedPrice_ForACataloguedProduct_CountsOnItsPricePage()
    {
        var need = await Create("İkinci el RTX 3080 arıyorum", 15800);

        need.ProductSlug.Should().Be("rtx-3080");
        need.CategoryId.Should().Be(10);
        need.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddDays(14), TimeSpan.FromMinutes(1));

        var page = await _pricing.GetPageAsync("rtx-3080", "seller");
        page!.RealPrice.Should().Be(15800);
        page.SellTarget!.NeedId.Should().Be(need.Id);
    }

    [Fact]
    public async Task FixedPrice_AboveTheProductCeiling_IsRefused()
    {
        var act = () => Create("RTX 3080 arıyorum", 45000);
        (await act.Should().ThrowAsync<BusinessException>()).WithMessage("*en fazla 30.000 TL*");
    }

    [Fact]
    public async Task SecondListingForTheSameProduct_StaysAnOrdinaryListing()
    {
        await Create("RTX 3080 arıyorum", 15000);
        var second = await Create("Bir tane daha RTX 3080 arıyorum", 14000);

        second.ProductSlug.Should().BeNull();
        (await _pricing.GetPageAsync("rtx-3080", null))!.SeekerCount.Should().Be(1);
    }

    // ---------------- offers

    [Theory]
    [InlineData(3500)]
    [InlineData(2500)]
    public async Task FixedPrice_RefusesAnyOtherPrice(decimal price)
    {
        var need = await Create("Bebek arabası arıyorum", 3000);

        var act = () => _offers.CreateOfferAsync(OfferAt(need.Id, price), "seller");

        (await act.Should().ThrowAsync<ValidationException>()).Which.Errors["Price"][0]
            .Should().Contain("yalnızca 3.000 TL");
        _context.Offers.Should().BeEmpty();
    }

    [Fact]
    public async Task FixedPrice_AcceptsAnOfferAtExactlyThePrice_FromOlderApps()
    {
        var need = await Create("Bebek arabası arıyorum", 3000);

        var offer = await _offers.CreateOfferAsync(OfferAt(need.Id, 3000), "seller");

        offer.AtListedPrice.Should().BeTrue();
    }

    [Fact]
    public async Task SellAtPrice_CreatesAReadyOffer()
    {
        var need = await Create("Bebek arabası arıyorum", 3000);

        var offer = await _offers.CreateAtListedPriceOfferAsync(need.Id, "seller");

        offer.Price.Should().Be(3000);
        offer.AtListedPrice.Should().BeTrue();
        offer.Description.Should().Contain("3.000 TL");
        offer.Status.Should().Be(OfferStatus.Pending);

        var again = () => _offers.CreateAtListedPriceOfferAsync(need.Id, "seller");
        await again.Should().ThrowAsync<ValidationException>(); // one pending offer per seller
    }

    [Fact]
    public async Task OfferingAtThePrice_EndsThatSellersPriceWatch()
    {
        var need = await Create("Bebek arabası arıyorum", 3000);
        await _needs.SetPriceWatchAsync(need.Id, "seller", true);
        await _needs.SetPriceWatchAsync(need.Id, "seller2", true);

        await _offers.CreateAtListedPriceOfferAsync(need.Id, "seller");

        (await _needs.GetNeedByIdAsync(need.Id, "seller2"))!.PriceWatchCount.Should().Be(1);
    }

    [Fact]
    public async Task SellAtPrice_OnAListingWithoutAPrice_IsRefused()
    {
        var need = await Create("Bebek arabası arıyorum", null, isFixed: false);

        var act = () => _offers.CreateAtListedPriceOfferAsync(need.Id, "seller");
        await act.Should().ThrowAsync<BusinessException>();
    }

    [Fact]
    public async Task OwnerCannotSellToThemselves()
    {
        var need = await Create("Bebek arabası arıyorum", 3000);

        var act = () => _offers.CreateAtListedPriceOfferAsync(need.Id, "buyer");
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task AnOfferOnAFixedPriceListing_CannotChangeItsPrice()
    {
        var need = await Create("Bebek arabası arıyorum", 3000);
        var offer = await _offers.CreateAtListedPriceOfferAsync(need.Id, "seller");

        var act = () => _offers.UpdateOfferAsync(offer.Id, new UpdateOfferRequest { Price = 3400 }, "seller");
        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task OfferMessage_HasNoMinimumLength()
    {
        var need = await Create("Bebek arabası arıyorum", 3000, isFixed: false);

        var offer = await _offers.CreateOfferAsync(new CreateOfferRequest
        {
            NeedId = need.Id, Price = 2800, Currency = "TRY", Description = " Var ", DeliveryDays = 1
        }, "seller");

        offer.Description.Should().Be("Var");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task OfferMessage_CannotBeEmpty(string message)
    {
        var need = await Create("Bebek arabası arıyorum", 3000, isFixed: false);

        var act = () => _offers.CreateOfferAsync(new CreateOfferRequest
        {
            NeedId = need.Id, Price = 2800, Currency = "TRY", Description = message, DeliveryDays = 1
        }, "seller");

        (await act.Should().ThrowAsync<ValidationException>()).Which.Errors["Description"][0].Should().Contain("boş olamaz");
    }

    [Fact]
    public async Task OpenListing_StillTakesAnyPriceWithinTheBudget()
    {
        var need = await Create("Bebek arabası arıyorum", 3000, isFixed: false);

        var offer = await _offers.CreateOfferAsync(OfferAt(need.Id, 2400), "seller");

        offer.AtListedPrice.Should().BeFalse();
    }

    // ---------------- "fiyat artarsa haber ver"

    [Fact]
    public async Task PriceWatch_IsCountedAndToldAboutARaise_Once()
    {
        var need = await Create("Bebek arabası arıyorum", 3000);

        (await _needs.SetPriceWatchAsync(need.Id, "seller", true)).PriceWatchCount.Should().Be(1);
        (await _needs.SetPriceWatchAsync(need.Id, "seller", true)).PriceWatchCount.Should().Be(1); // idempotent
        (await _needs.SetPriceWatchAsync(need.Id, "seller2", true)).PriceWatchCount.Should().Be(2);

        var asSeller = await _needs.GetNeedByIdAsync(need.Id, "seller");
        asSeller!.IsWatchingPrice.Should().BeTrue();
        asSeller.PriceWatchCount.Should().Be(2);
        (await _needs.GetNeedByIdAsync(need.Id, "buyer2"))!.IsWatchingPrice.Should().BeFalse();

        await _needs.UpdateNeedAsync(need.Id, new UpdateNeedRequest { MaxBudget = 3400 }, "buyer");

        NotificationsFor("seller", "price_raised").Should().ContainSingle().Which.Body.Should().Contain("3.400 TL");
        NotificationsFor("seller2", "price_raised").Should().ContainSingle();
        (await _needs.GetNeedByIdAsync(need.Id, "seller"))!.PriceWatchCount.Should().Be(0);

        await _needs.UpdateNeedAsync(need.Id, new UpdateNeedRequest { MaxBudget = 3600 }, "buyer");
        NotificationsFor("seller", "price_raised").Should().ContainSingle(); // the watch was used up
    }

    [Fact]
    public async Task PriceWatch_StopsOnRequest_AndALowerPriceTellsNobody()
    {
        var need = await Create("Bebek arabası arıyorum", 3000);
        await _needs.SetPriceWatchAsync(need.Id, "seller", true);
        await _needs.SetPriceWatchAsync(need.Id, "seller2", true);

        (await _needs.SetPriceWatchAsync(need.Id, "seller2", false)).PriceWatchCount.Should().Be(1);
        await _needs.UpdateNeedAsync(need.Id, new UpdateNeedRequest { MaxBudget = 2800 }, "buyer");

        _context.Notifications.Where(n => n.Type == "price_raised").Should().BeEmpty();
        (await _needs.GetNeedByIdAsync(need.Id, "seller"))!.IsWatchingPrice.Should().BeTrue();
    }

    [Fact]
    public async Task PriceWatch_IsOnlyForOtherPeoplesFixedPriceListings()
    {
        var fixedNeed = await Create("Bebek arabası arıyorum", 3000);
        var openNeed = await Create("Mama sandalyesi arıyorum", 1500, isFixed: false);

        var own = () => _needs.SetPriceWatchAsync(fixedNeed.Id, "buyer", true);
        await own.Should().ThrowAsync<BusinessException>();
        var open = () => _needs.SetPriceWatchAsync(openNeed.Id, "seller", true);
        await open.Should().ThrowAsync<BusinessException>();
    }

    // ---------------- switching modes

    [Fact]
    public async Task OpeningToBargaining_TellsWatchers_AndLeavesThePricePage()
    {
        var need = await Create("RTX 3080 arıyorum", 15000);
        await _needs.SetPriceWatchAsync(need.Id, "seller", true);

        var updated = await _needs.UpdateNeedAsync(need.Id, new UpdateNeedRequest { IsFixedPrice = false }, "buyer");

        updated!.IsFixedPrice.Should().BeFalse();
        updated.ProductSlug.Should().BeNull();
        (await _pricing.GetPageAsync("rtx-3080", null))!.RealPrice.Should().BeNull();
        NotificationsFor("seller", "price_raised").Should().ContainSingle().Which.Title.Should().Be("İlan tekliflere açıldı");

        var offer = await _offers.CreateOfferAsync(OfferAt(need.Id, 14500), "seller");
        offer.AtListedPrice.Should().BeFalse();
    }

    [Fact]
    public async Task SwitchingToFixedPrice_NeedsAPrice_AndJoinsThePricePage()
    {
        var noPrice = await Create("Bebek arabası arıyorum", null, isFixed: false);
        var act = () => _needs.UpdateNeedAsync(noPrice.Id, new UpdateNeedRequest { IsFixedPrice = true }, "buyer");
        await act.Should().ThrowAsync<ValidationException>();

        var card = await Create("RTX 3080 arıyorum", null, isFixed: false, userId: "buyer2");
        var updated = await _needs.UpdateNeedAsync(card.Id, new UpdateNeedRequest { IsFixedPrice = true, MaxBudget = 15000 }, "buyer2");

        updated!.IsFixedPrice.Should().BeTrue();
        updated.MinBudget.Should().BeNull();
        updated.ProductSlug.Should().Be("rtx-3080");
    }

    [Fact]
    public async Task PricePageBid_IsAFixedPrice_AndARaiseTellsWatchers()
    {
        var bid = await _pricing.PlaceBidAsync("rtx-3080", "buyer", new ProductBidRequest { Price = 15000 });
        (await _needs.GetNeedByIdAsync(bid.NeedId))!.IsFixedPrice.Should().BeTrue();

        await _needs.SetPriceWatchAsync(bid.NeedId, "seller", true);
        await _pricing.PlaceBidAsync("rtx-3080", "buyer", new ProductBidRequest { Price = 15500 });

        NotificationsFor("seller", "price_raised").Should().ContainSingle();

        var seeker = await _pricing.PlaceBidAsync("rtx-3080", "buyer2", new ProductBidRequest { Price = null });
        (await _needs.GetNeedByIdAsync(seeker.NeedId))!.IsFixedPrice.Should().BeFalse();
    }

    // ---------------- housekeeping

    [Fact]
    public async Task SilentFixedPriceListing_GetsOneNudge()
    {
        var silent = await Create("Bebek arabası arıyorum", 3000);
        var fresh = await Create("Mama sandalyesi arıyorum", 1500, userId: "buyer2");
        var answered = await Create("Oyun parkı arıyorum", 2000);
        await _offers.CreateAtListedPriceOfferAsync(answered.Id, "seller");
        await _needs.SetPriceWatchAsync(silent.Id, "seller", true);

        foreach (var id in new[] { silent.Id, answered.Id })
        {
            (await _context.Needs.FindAsync(id))!.UpdatedAt = DateTime.UtcNow.AddDays(-4);
        }
        await _context.SaveChangesAsync();

        await _pricing.CloseStaleListingsAsync();
        await _pricing.CloseStaleListingsAsync();

        var nudge = _context.Notifications.Where(n => n.Type == "price_nudge").ToList();
        nudge.Should().ContainSingle();
        nudge[0].UserId.Should().Be("buyer");
        nudge[0].Body.Should().Contain("3.000 TL").And.Contain("1 satıcı");
        _ = fresh;
    }

    [Fact]
    public async Task UnansweredAtPriceOffer_ClosesAnyFixedPriceListing()
    {
        var need = await Create("Bebek arabası arıyorum", 3000);
        var offer = await _offers.CreateAtListedPriceOfferAsync(need.Id, "seller");
        (await _context.Offers.FindAsync(offer.Id))!.CreatedAt = DateTime.UtcNow.AddDays(-8);
        await _context.SaveChangesAsync();

        (await _pricing.CloseStaleListingsAsync()).Should().Be(1);

        (await _context.Needs.FindAsync(need.Id))!.Status.Should().Be(NeedStatus.Expired);
        (await _context.Offers.FindAsync(offer.Id))!.Status.Should().Be(OfferStatus.Rejected);
        NotificationsFor("buyer", "need_expired").Should().ContainSingle().Which.Body.Should().Contain("İlanlarım");
        NotificationsFor("seller", "offer_unanswered").Should().ContainSingle();
    }

    public void Dispose() => _context.Dispose();
}
