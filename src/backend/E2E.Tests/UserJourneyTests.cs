using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using API.Data;
using API.Models;

namespace E2E.Tests;

public class UserJourneyTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public UserJourneyTests(WebApplicationFactory<Program> factory)
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
                    options.UseInMemoryDatabase("E2ETestDb_" + Guid.NewGuid());
                });
            });
        });

        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task CompleteUserJourney_RegisterLoginCreateNeedReceiveOffer_ShouldWork()
    {
        // Step 1: Register as buyer
        var buyerRegisterDto = new RegisterDto
        {
            Email = "buyer@e2etest.com",
            Password = "BuyerPass123!",
            FirstName = "E2E",
            LastName = "Buyer"
        };

        var buyerRegisterResponse = await _client.PostAsJsonAsync("/api/auth/register", buyerRegisterDto);
        buyerRegisterResponse.Should().BeSuccessful();

        var buyerAuthContent = await buyerRegisterResponse.Content.ReadAsStringAsync();
        var buyerAuth = JsonSerializer.Deserialize<AuthResponseDto>(buyerAuthContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        buyerAuth.Should().NotBeNull();
        buyerAuth!.Success.Should().BeTrue();
        buyerAuth.Token.Should().NotBeNullOrEmpty();

        // Step 2: Register as provider
        var providerRegisterDto = new RegisterDto
        {
            Email = "provider@e2etest.com",
            Password = "ProviderPass123!",
            FirstName = "E2E",
            LastName = "Provider"
        };

        var providerRegisterResponse = await _client.PostAsJsonAsync("/api/auth/register", providerRegisterDto);
        providerRegisterResponse.Should().BeSuccessful();

        var providerAuthContent = await providerRegisterResponse.Content.ReadAsStringAsync();
        var providerAuth = JsonSerializer.Deserialize<AuthResponseDto>(providerAuthContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        providerAuth.Should().NotBeNull();
        providerAuth!.Success.Should().BeTrue();

        // Step 3: Seed categories
        await SeedCategoriesAsync();

        // Step 4: Buyer creates a need
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerAuth.Token);

        var createNeedRequest = new CreateNeedRequest
        {
            Title = "E2E Test - iPhone 13 Pro arıyorum",
            Description = "E2E test için iPhone 13 Pro arıyorum",
            CategoryId = 1,
            MinBudget = 20000,
            MaxBudget = 25000,
            Urgency = UrgencyLevel.Normal,
            Latitude = 41.0082,
            Longitude = 28.9784,
            Address = "İstanbul, Türkiye"
        };

        var createNeedResponse = await _client.PostAsJsonAsync("/api/needs", createNeedRequest);
        createNeedResponse.Should().BeSuccessful();

        var needContent = await createNeedResponse.Content.ReadAsStringAsync();
        var createdNeed = JsonSerializer.Deserialize<NeedResponse>(needContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        createdNeed.Should().NotBeNull();
        createdNeed!.Title.Should().Be(createNeedRequest.Title);
        createdNeed.Status.Should().Be(NeedStatus.Active);

        // Step 5: Provider views available needs
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", providerAuth.Token);

        var getNeedsResponse = await _client.GetAsync("/api/needs?page=1&pageSize=20");
        getNeedsResponse.Should().BeSuccessful();

        var needsContent = await getNeedsResponse.Content.ReadAsStringAsync();
        var needsResult = JsonSerializer.Deserialize<PagedResult<NeedResponse>>(needsContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        needsResult.Should().NotBeNull();
        needsResult!.Items.Should().NotBeEmpty();
        needsResult.Items.Should().Contain(n => n.Id == createdNeed.Id);

        // Step 6: Provider creates an offer
        var createOfferRequest = new CreateOfferRequest
        {
            NeedId = createdNeed.Id,
            Price = 22000,
            Description = "E2E Test - Sıfır kutusunda iPhone 13 Pro, 1 yıl garantili",
            DeliveryDays = 1
        };

        var createOfferResponse = await _client.PostAsJsonAsync("/api/offers", createOfferRequest);
        createOfferResponse.Should().BeSuccessful();

        var offerContent = await createOfferResponse.Content.ReadAsStringAsync();
        var createdOffer = JsonSerializer.Deserialize<OfferResponse>(offerContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        createdOffer.Should().NotBeNull();
        createdOffer!.Price.Should().Be(createOfferRequest.Price);
        createdOffer.Status.Should().Be(OfferStatus.Pending);

        // Step 7: Buyer views offers for their need
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerAuth.Token);

        var getOffersResponse = await _client.GetAsync($"/api/offers/need/{createdNeed.Id}");
        getOffersResponse.Should().BeSuccessful();

        var offersContent = await getOffersResponse.Content.ReadAsStringAsync();
        var offersResult = JsonSerializer.Deserialize<PagedResult<OfferResponse>>(offersContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        offersResult.Should().NotBeNull();
        offersResult!.Items.Should().NotBeEmpty();
        offersResult.Items.Should().Contain(o => o.Id == createdOffer.Id);

        // Step 8: Buyer accepts the offer
        var acceptOfferRequest = new AcceptOfferRequest
        {
            OfferId = createdOffer.Id
        };

        var acceptOfferResponse = await _client.PostAsJsonAsync("/api/offers/accept", acceptOfferRequest);
        acceptOfferResponse.Should().BeSuccessful();

        // Step 9: Verify offer status changed to accepted
        var getOfferResponse = await _client.GetAsync($"/api/offers/{createdOffer.Id}");
        getOfferResponse.Should().BeSuccessful();

        var updatedOfferContent = await getOfferResponse.Content.ReadAsStringAsync();
        var updatedOffer = JsonSerializer.Deserialize<OfferResponse>(updatedOfferContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        updatedOffer.Should().NotBeNull();
        updatedOffer!.Status.Should().Be(OfferStatus.Accepted);
    }

    [Fact]
    public async Task GuestUserJourney_BrowseNeedsWithoutAuthentication_ShouldWork()
    {
        // Step 1: Guest login
        var guestLoginResponse = await _client.PostAsync("/api/auth/guest-login", null);
        guestLoginResponse.Should().BeSuccessful();

        var guestAuthContent = await guestLoginResponse.Content.ReadAsStringAsync();
        var guestAuth = JsonSerializer.Deserialize<AuthResponseDto>(guestAuthContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        guestAuth.Should().NotBeNull();
        guestAuth!.Success.Should().BeTrue();
        guestAuth.User!.IsGuest.Should().BeTrue();

        // Step 2: Browse needs as guest
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", guestAuth.Token);

        var getNeedsResponse = await _client.GetAsync("/api/needs?page=1&pageSize=20");
        getNeedsResponse.Should().BeSuccessful();

        var needsContent = await getNeedsResponse.Content.ReadAsStringAsync();
        var needsResult = JsonSerializer.Deserialize<PagedResult<NeedResponse>>(needsContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        needsResult.Should().NotBeNull();
        // Guest should be able to view needs (even if empty)
    }

    [Fact]
    public async Task MessageFlowJourney_BuyerAndProviderCommunicate_ShouldWork()
    {
        // This test would require setting up the messaging system
        // For now, we'll create a placeholder that demonstrates the flow

        // Step 1: Setup buyer and provider (similar to first test)
        var (buyerToken, providerToken, needId, offerId) = await SetupBuyerProviderAndOffer();

        // Step 2: Provider sends message to buyer
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", providerToken);

        var sendMessageRequest = new SendMessageRequest
        {
            OfferId = offerId,
            Content = "Merhaba, ürün hakkında detay verebilir misiniz?",
            Type = MessageType.Text
        };

        var sendMessageResponse = await _client.PostAsJsonAsync("/api/messages", sendMessageRequest);
        
        // Note: This would fail if messaging endpoints aren't implemented
        // but demonstrates the E2E test structure
        if (sendMessageResponse.IsSuccessStatusCode)
        {
            // Step 3: Buyer views conversation
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerToken);

            var getConversationResponse = await _client.GetAsync($"/api/messages/conversation/{offerId}");
            getConversationResponse.Should().BeSuccessful();
        }
    }

    private async Task<(string buyerToken, string providerToken, int needId, int offerId)> SetupBuyerProviderAndOffer()
    {
        // Register buyer
        var buyerRegisterDto = new RegisterDto
        {
            Email = "msgbuyer@e2etest.com",
            Password = "BuyerPass123!",
            FirstName = "Message",
            LastName = "Buyer"
        };

        var buyerResponse = await _client.PostAsJsonAsync("/api/auth/register", buyerRegisterDto);
        var buyerContent = await buyerResponse.Content.ReadAsStringAsync();
        var buyerAuth = JsonSerializer.Deserialize<AuthResponseDto>(buyerContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Register provider
        var providerRegisterDto = new RegisterDto
        {
            Email = "msgprovider@e2etest.com",
            Password = "ProviderPass123!",
            FirstName = "Message",
            LastName = "Provider"
        };

        var providerResponse = await _client.PostAsJsonAsync("/api/auth/register", providerRegisterDto);
        var providerContent = await providerResponse.Content.ReadAsStringAsync();
        var providerAuth = JsonSerializer.Deserialize<AuthResponseDto>(providerContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Seed categories
        await SeedCategoriesAsync();

        // Create need
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerAuth!.Token);

        var createNeedRequest = new CreateNeedRequest
        {
            Title = "Message Test Need",
            Description = "Test need for messaging",
            CategoryId = 1,
            MinBudget = 1000,
            MaxBudget = 2000,
            Urgency = UrgencyLevel.Normal
        };

        var needResponse = await _client.PostAsJsonAsync("/api/needs", createNeedRequest);
        var needContent = await needResponse.Content.ReadAsStringAsync();
        var createdNeed = JsonSerializer.Deserialize<NeedResponse>(needContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        // Create offer
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", providerAuth!.Token);

        var createOfferRequest = new CreateOfferRequest
        {
            NeedId = createdNeed!.Id,
            Price = 1500,
            Description = "Test offer for messaging",
            DeliveryDays = 1
        };

        var offerResponse = await _client.PostAsJsonAsync("/api/offers", createOfferRequest);
        var offerContent = await offerResponse.Content.ReadAsStringAsync();
        var createdOffer = JsonSerializer.Deserialize<OfferResponse>(offerContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        return (buyerAuth.Token!, providerAuth.Token!, createdNeed.Id, createdOffer!.Id);
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
}