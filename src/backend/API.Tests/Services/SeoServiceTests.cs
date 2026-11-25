using API.Data;
using API.Models;
using API.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace API.Tests.Services;

public class SeoServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly SeoService _seoService;

    public SeoServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["App:WebBaseUrl"] = "https://example.test",
                ["BaseUrl"] = "https://api.example.test"
            })
            .Build();
        _seoService = new SeoService(_context, configuration);

        _context.Users.Add(new ApplicationUser { Id = "user-1", UserName = "u1", Email = "u1@example.test" });
        _context.Categories.AddRange(
            new Category { Id = 1, Name = "Home", NameTr = "Ev & Yaşam", IsActive = true },
            new Category { Id = 2, Name = "Cleaning", NameTr = "Temizlik", ParentCategoryId = 1, IsActive = true });
        _context.Needs.AddRange(
            new Need
            {
                Id = 10, Title = "Koltuk yıkama <acil>", Description = "3+1 koltuk takımı \"yerinde\" yıkanacak.",
                CategoryId = 2, MinBudget = 1500, MaxBudget = 3000, Address = "Kadıköy, İstanbul",
                Status = NeedStatus.Active, UserId = "user-1",
                Images = { new NeedImage { ImageUrl = "/uploads/needs/a.jpg", SortOrder = 0 } }
            },
            new Need
            {
                Id = 11, Title = "Bekleyen ilan", Description = "Onay bekliyor", CategoryId = 2,
                Status = NeedStatus.PendingReview, UserId = "user-1"
            },
            new Need
            {
                Id = 12, Title = "Kapanan ilan", Description = "Tamamlandı", CategoryId = 2,
                Status = NeedStatus.Completed, UserId = "user-1"
            });
        _context.SaveChanges();
    }

    [Fact]
    public async Task Sitemap_ListsOnlyActiveNeeds_AndRootCategories()
    {
        var xml = await _seoService.BuildSitemapAsync();

        xml.Should().Contain("<loc>https://example.test/</loc>");
        xml.Should().Contain("<loc>https://example.test/needs/10</loc>");
        xml.Should().NotContain("/needs/11<").And.NotContain("/needs/12<");
        xml.Should().Contain("/needs?categoryId=1<").And.NotContain("categoryId=2");
        System.Xml.Linq.XDocument.Parse(xml).Root!.Name.LocalName.Should().Be("urlset");
    }

    [Fact]
    public async Task NeedPage_ContainsEscapedTitle_Summary_AndAbsoluteImage()
    {
        var html = await _seoService.BuildNeedPageAsync(10);

        html.Should().NotBeNull();
        html.Should().Contain("<title>Koltuk yıkama &lt;acil&gt; | Arayanibul</title>");
        html.Should().NotContain("<acil>");
        html.Should().Contain("<link rel=\"canonical\" href=\"https://example.test/needs/10\" />");
        html.Should().Contain("og:image\" content=\"https://api.example.test/uploads/needs/a.jpg\"");
        html.Should().Contain("Temizlik · Kadıköy, İstanbul · Bütçe: 1.500 – 3.000 TL");
        html.Should().Contain("&quot;yerinde&quot;");
    }

    [Theory]
    [InlineData(11)]
    [InlineData(12)]
    [InlineData(999)]
    public async Task NeedPage_IsNull_WhenNeedIsNotPubliclyListed(int needId)
    {
        (await _seoService.BuildNeedPageAsync(needId)).Should().BeNull();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
