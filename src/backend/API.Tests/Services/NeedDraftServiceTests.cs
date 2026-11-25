using API.Interfaces;
using API.Models;
using API.Services;
using FluentAssertions;
using Moq;

namespace API.Tests.Services;

public class NeedDraftServiceTests
{
    private readonly NeedDraftService _service;

    public NeedDraftServiceTests()
    {
        var electronics = new Category { Id = 1, Name = "Electronics", NameTr = "Elektronik" };
        electronics.SubCategories.AddRange(new[]
        {
            new Category { Id = 14, Name = "Computers & Laptops", NameTr = "Bilgisayar & Laptop", ParentCategoryId = 1 },
            new Category { Id = 65, Name = "Computer Components", NameTr = "Bilgisayar Parçaları", ParentCategoryId = 1 },
            new Category { Id = 15, Name = "TV & Audio", NameTr = "TV & Ses Sistemi", ParentCategoryId = 1 }
        });
        var baby = new Category { Id = 11, Name = "Baby & Kids", NameTr = "Bebek & Çocuk" };
        baby.SubCategories.AddRange(new[]
        {
            new Category { Id = 57, Name = "Baby Products", NameTr = "Bebek Ürünleri", ParentCategoryId = 11 },
            new Category { Id = 66, Name = "Maternity & Nursing", NameTr = "Anne Ürünleri", ParentCategoryId = 11 }
        });
        var camping = new Category { Id = 67, Name = "Camping & Caravan", NameTr = "Kamp & Karavan" };
        camping.SubCategories.AddRange(new[]
        {
            new Category { Id = 68, Name = "Tents & Sleeping Gear", NameTr = "Çadır & Uyku Ekipmanı", ParentCategoryId = 67 },
            new Category { Id = 70, Name = "Caravans & Trailers", NameTr = "Karavan & Çekme Karavan", ParentCategoryId = 67 },
            new Category { Id = 71, Name = "Caravan Equipment", NameTr = "Karavan Ekipmanı & Aksesuar", ParentCategoryId = 67 }
        });
        var services = new Category { Id = 3, Name = "Services", NameTr = "Hizmetler" };
        services.SubCategories.Add(new Category { Id = 23, Name = "Cleaning Services", NameTr = "Temizlik Hizmetleri", ParentCategoryId = 3 });

        var categoryService = new Mock<ICategoryService>();
        categoryService.Setup(c => c.GetCategoriesAsync())
            .ReturnsAsync(new List<Category> { electronics, baby, camping, services });
        _service = new NeedDraftService(categoryService.Object);
    }

    [Fact]
    public async Task FullSentence_YieldsCategoryBudgetLocationAndCleanTitle()
    {
        var draft = await _service.BuildDraftAsync("İkinci el RTX 3080, 15 bin TL'ye kadar, İstanbul");

        draft.CategoryId.Should().Be(65);
        draft.CategoryName.Should().Be("Bilgisayar Parçaları");
        draft.ParentCategoryName.Should().Be("Elektronik");
        draft.MaxBudget.Should().Be(15000);
        draft.MinBudget.Should().BeNull();
        draft.Address.Should().Be("İstanbul");
        draft.Title.Should().Be("İkinci el RTX 3080");
        draft.Description.Should().Be("İkinci el RTX 3080, 15 bin TL'ye kadar, İstanbul");
        draft.Questions.Should().Contain(q => q.Label == "Durum" && q.Selected == "İkinci el");
        draft.Questions.Should().Contain(q => q.Label == "Garanti veya fatura");
    }

    [Theory]
    [InlineData("ekran karti ariyorum 12.500 tl", null, 12500)]
    [InlineData("Ryzen 5 5600 en fazla 4000 lira", null, 4000)]
    [InlineData("laptop 20-30 bin arası", 20000, 30000)]
    [InlineData("laptop 20.000 - 30.000 TL", 20000, 30000)]
    [InlineData("macbook bütçem 45 bin", null, 45000)]
    [InlineData("karavan 1,5 milyon TL", null, 1500000)]
    [InlineData("çadır en az 2 bin tl", 2000, null)]
    [InlineData("monitör ₺7.500", null, 7500)]
    public async Task Budget_IsParsed(string text, int? min, int? max)
    {
        var draft = await _service.BuildDraftAsync(text);

        draft.MinBudget.Should().Be(min);
        draft.MaxBudget.Should().Be(max);
    }

    [Theory]
    [InlineData("RTX 3080 arıyorum")]              // model number
    [InlineData("4k monitör 27 inç 144hz")]        // resolution, size, refresh rate
    [InlineData("16 gb ddr4 ram 3200 mhz")]        // capacity and speed
    [InlineData("2020-2022 model çekme karavan")]  // year range
    [InlineData("4 kişilik çadır")]                // capacity
    [InlineData("iPhone 13 128 gb")]
    public async Task NumbersThatAreNotMoney_AreNotReadAsBudget(string text)
    {
        var draft = await _service.BuildDraftAsync(text);

        draft.MinBudget.Should().BeNull();
        draft.MaxBudget.Should().BeNull();
    }

    [Theory]
    [InlineData("bebek arabası arıyorum ankarada", "Ankara")]
    [InlineData("Kadıköy'de koltuk yıkama", "Kadıköy, İstanbul")]
    [InlineData("çadır lazım, Kadıköy İstanbul", "Kadıköy, İstanbul")]
    [InlineData("izmir'den ikinci el puset", "İzmir")]
    [InlineData("çekme karavan arıyorum", null)]   // "van" inside "karavan" is not the city
    [InlineData("ordudan mama sandalyesi", "Ordu")]
    public async Task Location_IsParsed(string text, string? expected)
    {
        (await _service.BuildDraftAsync(text)).Address.Should().Be(expected);
    }

    [Theory]
    [InlineData("çekme karavan arıyorum", 70)]
    [InlineData("karavan için güneş paneli", 71)]
    [InlineData("4 kişilik çadırı olan var mı", 68)]
    [InlineData("momcozy göğüs pompası", 66)]
    [InlineData("cybex oto koltuğu", 57)]
    [InlineData("ekran karti", 65)]                // typed without Turkish characters
    [InlineData("gaming laptop", 14)]
    [InlineData("koltuk yıkama", 23)]
    public async Task Category_IsRecognised(string text, int expectedCategoryId)
    {
        (await _service.BuildDraftAsync(text)).CategoryId.Should().Be(expectedCategoryId);
    }

    [Fact]
    public async Task UnknownText_LeavesCategoryEmpty_AndStillGivesValidTitleAndDescription()
    {
        var draft = await _service.BuildDraftAsync("xyz");

        draft.CategoryId.Should().BeNull();
        draft.Questions.Should().BeEmpty();
        draft.Title.Length.Should().BeGreaterThanOrEqualTo(5);
        draft.Description.Length.Should().BeGreaterThanOrEqualTo(10);
    }

    [Theory]
    [InlineData("ikinci el rtx 3080 ariyorum 15 bin tl ye kadar kadıköy", "İkinci el rtx 3080")]
    [InlineData("Cybex oto koltuğu lazım", "Cybex oto koltuğu")]
    [InlineData("4 kişilik çadırı olan var mı?", "4 kişilik çadırı")]
    [InlineData("arıyorum", "Arıyorum")]           // nothing left to name the listing: keep the text
    public async Task Title_DropsFillerWords(string text, string expectedTitle)
    {
        (await _service.BuildDraftAsync(text)).Title.Should().Be(expectedTitle);
    }

    [Fact]
    public async Task LongText_TitleIsCutAtWordBoundary()
    {
        var text = "Karavanım için 200 amper lityum akü, inverter, güneş paneli ve şarj kontrol cihazından oluşan komple bir set arıyorum montaj dahil olabilir";

        var draft = await _service.BuildDraftAsync(text);

        draft.Title.Length.Should().BeLessThanOrEqualTo(80);
        text.Should().StartWith(draft.Title);
        draft.Description.Should().Be(text);
    }

    [Fact]
    public async Task CampingListing_AsksConditionAndPurpose_AndDetectsRental()
    {
        var draft = await _service.BuildDraftAsync("Hafta sonu için kiralık çekme karavan");

        draft.Questions.Select(q => q.Label).Should().Contain(new[] { "Durum", "Amaç" });
        draft.Questions.Single(q => q.Label == "Amaç").Selected.Should().Be("Kiralama");
    }
}
