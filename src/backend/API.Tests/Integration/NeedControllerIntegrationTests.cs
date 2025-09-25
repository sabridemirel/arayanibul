using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Net.Http.Json;
using System.Text.Json;
using System.Net.Http.Headers;
using FluentAssertions;
using API.Data;
using API.Models;

namespace API.Tests.Integration;

public class NeedControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public NeedControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ASPNETCORE_ENVIRONMENT", "Testing");
            builder.ConfigureServices(services =>
            {
                // Remove the existing DbContext registration
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                // Add in-memory database for testing
                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseInMemoryDatabase("TestDb_" + Guid.NewGuid());
                });
            });
        });

        _client = _factory.CreateClient();
    }

    private async Task<string> GetAuthTokenAsync()
    {
        var registerDto = new RegisterDto
        {
            Email = "needtest@example.com",
            Password = "Test123!",
            FirstName = "Need",
            LastName = "Tester"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", registerDto);
        var content = await response.Content.ReadAsStringAsync();
        var authResponse = JsonSerializer.Deserialize<AuthResponseDto>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        return authResponse!.Token!;
    }

    private async Task SeedCategoriesAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        if (!await context.Categories.AnyAsync())
        {
            var category = new Category
            {
                Id = 1,
                Name = "Electronics",
                NameTr = "Elektronik",
                IsActive = true,
                SortOrder = 1
            };
            
            context.Categories.Add(category);
            await context.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task CreateNeed_WithValidData_ShouldReturnCreatedNeed()
    {
        // Arrange
        await SeedCategoriesAsync();
        var token = await GetAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var createNeedRequest = new CreateNeedRequest
        {
            Title = "iPhone 13 Pro arıyorum",
            Description = "Temiz durumda iPhone 13 Pro arıyorum, bütçem 25000 TL",
            CategoryId = 1,
            MinBudget = 20000,
            MaxBudget = 25000,
            Urgency = UrgencyLevel.Normal,
            Latitude = 41.0082,
            Longitude = 28.9784,
            Address = "İstanbul, Türkiye"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/needs", createNeedRequest);

        // Assert
        response.Should().BeSuccessful();
        
        var content = await response.Content.ReadAsStringAsync();
        var needResponse = JsonSerializer.Deserialize<NeedResponse>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        needResponse.Should().NotBeNull();
        needResponse!.Title.Should().Be(createNeedRequest.Title);
        needResponse.Description.Should().Be(createNeedRequest.Description);
        needResponse.Status.Should().Be(NeedStatus.Active);
    }

    [Fact]
    public async Task GetNeeds_ShouldReturnPagedResults()
    {
        // Arrange
        await SeedCategoriesAsync();
        var token = await GetAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Create a need first
        var createNeedRequest = new CreateNeedRequest
        {
            Title = "Test Need",
            Description = "Test Description",
            CategoryId = 1,
            MinBudget = 1000,
            MaxBudget = 2000,
            Urgency = UrgencyLevel.Normal
        };
        await _client.PostAsJsonAsync("/api/needs", createNeedRequest);

        // Act
        var response = await _client.GetAsync("/api/needs?page=1&pageSize=10");

        // Assert
        response.Should().BeSuccessful();
        
        var content = await response.Content.ReadAsStringAsync();
        var pagedResult = JsonSerializer.Deserialize<PagedResult<NeedResponse>>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        pagedResult.Should().NotBeNull();
        pagedResult!.Items.Should().NotBeEmpty();
        pagedResult.TotalCount.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetNeedById_WithExistingId_ShouldReturnNeed()
    {
        // Arrange
        await SeedCategoriesAsync();
        var token = await GetAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Create a need first
        var createNeedRequest = new CreateNeedRequest
        {
            Title = "Specific Need",
            Description = "Specific Description",
            CategoryId = 1,
            MinBudget = 1000,
            MaxBudget = 2000,
            Urgency = UrgencyLevel.Normal
        };
        
        var createResponse = await _client.PostAsJsonAsync("/api/needs", createNeedRequest);
        var createContent = await createResponse.Content.ReadAsStringAsync();
        var createdNeed = JsonSerializer.Deserialize<NeedResponse>(createContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Act
        var response = await _client.GetAsync($"/api/needs/{createdNeed!.Id}");

        // Assert
        response.Should().BeSuccessful();
        
        var content = await response.Content.ReadAsStringAsync();
        var needResponse = JsonSerializer.Deserialize<NeedResponse>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        needResponse.Should().NotBeNull();
        needResponse!.Id.Should().Be(createdNeed.Id);
        needResponse.Title.Should().Be(createNeedRequest.Title);
    }

    [Fact]
    public async Task GetNeedById_WithNonExistingId_ShouldReturnNotFound()
    {
        // Arrange
        var token = await GetAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync("/api/needs/999999");

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SearchNeeds_WithSearchTerm_ShouldReturnMatchingNeeds()
    {
        // Arrange
        await SeedCategoriesAsync();
        var token = await GetAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Create needs with different titles
        var need1 = new CreateNeedRequest
        {
            Title = "iPhone 13 Pro arıyorum",
            Description = "Temiz iPhone lazım",
            CategoryId = 1,
            Urgency = UrgencyLevel.Normal
        };

        var need2 = new CreateNeedRequest
        {
            Title = "Samsung Galaxy arıyorum",
            Description = "Android telefon lazım",
            CategoryId = 1,
            Urgency = UrgencyLevel.Normal
        };

        await _client.PostAsJsonAsync("/api/needs", need1);
        await _client.PostAsJsonAsync("/api/needs", need2);

        // Act
        var response = await _client.GetAsync("/api/needs/search?searchText=iPhone");

        // Assert
        response.Should().BeSuccessful();
        
        var content = await response.Content.ReadAsStringAsync();
        var searchResults = JsonSerializer.Deserialize<List<NeedResponse>>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        searchResults.Should().NotBeNull();
        searchResults!.Should().NotBeEmpty();
        searchResults.Should().Contain(n => n.Title.Contains("iPhone"));
        searchResults.Should().NotContain(n => n.Title.Contains("Samsung"));
    }
}