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

public class OfferControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public OfferControllerIntegrationTests(WebApplicationFactory<Program> factory)
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

    private async Task<(string buyerToken, string providerToken)> GetAuthTokensAsync()
    {
        // Register buyer
        var buyerDto = new RegisterDto
        {
            Email = "buyer@example.com",
            Password = "Test123!",
            FirstName = "Buyer",
            LastName = "User"
        };

        var buyerResponse = await _client.PostAsJsonAsync("/api/auth/register", buyerDto);
        var buyerContent = await buyerResponse.Content.ReadAsStringAsync();
        var buyerAuth = JsonSerializer.Deserialize<AuthResponseDto>(buyerContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Register provider
        var providerDto = new RegisterDto
        {
            Email = "provider@example.com",
            Password = "Test123!",
            FirstName = "Provider",
            LastName = "User"
        };

        var providerResponse = await _client.PostAsJsonAsync("/api/auth/register", providerDto);
        var providerContent = await providerResponse.Content.ReadAsStringAsync();
        var providerAuth = JsonSerializer.Deserialize<AuthResponseDto>(providerContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        return (buyerAuth!.Token!, providerAuth!.Token!);
    }

    private async Task<int> CreateTestNeedAsync(string buyerToken)
    {
        // Seed category first
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

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", buyerToken);

        var createNeedRequest = new CreateNeedRequest
        {
            Title = "iPhone 13 Pro arıyorum",
            Description = "Temiz durumda iPhone 13 Pro arıyorum",
            CategoryId = 1,
            MinBudget = 20000,
            MaxBudget = 25000,
            Urgency = UrgencyLevel.Normal
        };

        var response = await _client.PostAsJsonAsync("/api/needs", createNeedRequest);
        var content = await response.Content.ReadAsStringAsync();
        var needResponse = JsonSerializer.Deserialize<NeedResponse>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        return needResponse!.Id;
    }

    [Fact]
    public async Task CreateOffer_WithValidData_ShouldReturnCreatedOffer()
    {
        // Arrange
        var (buyerToken, providerToken) = await GetAuthTokensAsync();
        var needId = await CreateTestNeedAsync(buyerToken);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", providerToken);

        var createOfferRequest = new CreateOfferRequest
        {
            NeedId = needId,
            Price = 22000,
            Description = "Sıfır kutusunda iPhone 13 Pro, 1 yıl garantili",
            DeliveryDays = 1
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/offers", createOfferRequest);

        // Assert
        response.Should().BeSuccessful();
        
        var content = await response.Content.ReadAsStringAsync();
        var offerResponse = JsonSerializer.Deserialize<OfferResponse>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        offerResponse.Should().NotBeNull();
        offerResponse!.Price.Should().Be(createOfferRequest.Price);
        offerResponse.Description.Should().Be(createOfferRequest.Description);
        offerResponse.Status.Should().Be(OfferStatus.Pending);
    }

    [Fact]
    public async Task GetOffersForNeed_ShouldReturnOffers()
    {
        // Arrange
        var (buyerToken, providerToken) = await GetAuthTokensAsync();
        var needId = await CreateTestNeedAsync(buyerToken);

        // Create an offer
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", providerToken);
        var createOfferRequest = new CreateOfferRequest
        {
            NeedId = needId,
            Price = 22000,
            Description = "Test offer",
            DeliveryDays = 1
        };
        await _client.PostAsJsonAsync("/api/offers", createOfferRequest);

        // Act
        var response = await _client.GetAsync($"/api/offers/need/{needId}");

        // Assert
        response.Should().BeSuccessful();
        
        var content = await response.Content.ReadAsStringAsync();
        var pagedResult = JsonSerializer.Deserialize<PagedResult<OfferResponse>>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        pagedResult.Should().NotBeNull();
        pagedResult!.Items.Should().NotBeEmpty();
        pagedResult.Items.First().NeedId.Should().Be(needId);
    }

    [Fact]
    public async Task AcceptOffer_WithValidOffer_ShouldAcceptOffer()
    {
        // Arrange
        var (buyerToken, providerToken) = await GetAuthTokensAsync();
        var needId = await CreateTestNeedAsync(buyerToken);

        // Create an offer
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", providerToken);
        var createOfferRequest = new CreateOfferRequest
        {
            NeedId = needId,
            Price = 22000,
            Description = "Test offer",
            DeliveryDays = 1
        };
        
        var createResponse = await _client.PostAsJsonAsync("/api/offers", createOfferRequest);
        var createContent = await createResponse.Content.ReadAsStringAsync();
        var createdOffer = JsonSerializer.Deserialize<OfferResponse>(createContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Switch to buyer token
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", buyerToken);

        var acceptRequest = new AcceptOfferRequest
        {
            OfferId = createdOffer!.Id
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/offers/accept", acceptRequest);

        // Assert
        response.Should().BeSuccessful();

        // Verify offer status changed
        var getResponse = await _client.GetAsync($"/api/offers/{createdOffer.Id}");
        var getContent = await getResponse.Content.ReadAsStringAsync();
        var updatedOffer = JsonSerializer.Deserialize<OfferResponse>(getContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        updatedOffer!.Status.Should().Be(OfferStatus.Accepted);
    }

    [Fact]
    public async Task RejectOffer_WithValidOffer_ShouldRejectOffer()
    {
        // Arrange
        var (buyerToken, providerToken) = await GetAuthTokensAsync();
        var needId = await CreateTestNeedAsync(buyerToken);

        // Create an offer
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", providerToken);
        var createOfferRequest = new CreateOfferRequest
        {
            NeedId = needId,
            Price = 22000,
            Description = "Test offer",
            DeliveryDays = 1
        };
        
        var createResponse = await _client.PostAsJsonAsync("/api/offers", createOfferRequest);
        var createContent = await createResponse.Content.ReadAsStringAsync();
        var createdOffer = JsonSerializer.Deserialize<OfferResponse>(createContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Switch to buyer token
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", buyerToken);

        var rejectRequest = new RejectOfferRequest
        {
            OfferId = createdOffer!.Id,
            Reason = "Fiyat çok yüksek"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/offers/reject", rejectRequest);

        // Assert
        response.Should().BeSuccessful();

        // Verify offer status changed
        var getResponse = await _client.GetAsync($"/api/offers/{createdOffer.Id}");
        var getContent = await getResponse.Content.ReadAsStringAsync();
        var updatedOffer = JsonSerializer.Deserialize<OfferResponse>(getContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        updatedOffer!.Status.Should().Be(OfferStatus.Rejected);
    }

    [Fact]
    public async Task CreateOffer_WhenProviderIsBuyer_ShouldReturnBadRequest()
    {
        // Arrange
        var (buyerToken, _) = await GetAuthTokensAsync();
        var needId = await CreateTestNeedAsync(buyerToken);

        // Try to create offer with buyer token (same user who created the need)
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", buyerToken);

        var createOfferRequest = new CreateOfferRequest
        {
            NeedId = needId,
            Price = 22000,
            Description = "Self offer",
            DeliveryDays = 1
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/offers", createOfferRequest);

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }
}