using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Xunit;
using API.Models;
using API.Data;
using Microsoft.EntityFrameworkCore;
using System.Net;

namespace API.Tests.Integration
{
    public class EndToEndIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly HttpClient _client;

        public EndToEndIntegrationTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
            _client = _factory.CreateClient();
        }

        [Fact]
        public async Task CompleteUserJourney_RegisterLoginCreateNeedReceiveOffer_ShouldWork()
        {
            // 1. Register a buyer
            var buyerRegisterRequest = new RegisterRequest
            {
                Email = "buyer@test.com",
                Password = "Test123!",
                FirstName = "Test",
                LastName = "Buyer",
                UserType = UserType.Buyer
            };

            var buyerRegisterResponse = await _client.PostAsync("/api/auth/register",
                new StringContent(JsonSerializer.Serialize(buyerRegisterRequest), Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.OK, buyerRegisterResponse.StatusCode);
            var buyerAuthResult = JsonSerializer.Deserialize<AuthResponse>(
                await buyerRegisterResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            // 2. Register a provider
            var providerRegisterRequest = new RegisterRequest
            {
                Email = "provider@test.com",
                Password = "Test123!",
                FirstName = "Test",
                LastName = "Provider",
                UserType = UserType.Provider
            };

            var providerRegisterResponse = await _client.PostAsync("/api/auth/register",
                new StringContent(JsonSerializer.Serialize(providerRegisterRequest), Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.OK, providerRegisterResponse.StatusCode);
            var providerAuthResult = JsonSerializer.Deserialize<AuthResponse>(
                await providerRegisterResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            // 3. Buyer creates a need
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerAuthResult.Token);

            var createNeedRequest = new CreateNeedRequest
            {
                Title = "iPhone 13 Pro Arıyorum",
                Description = "Temiz durumda iPhone 13 Pro arıyorum",
                CategoryId = 1,
                MinBudget = 20000,
                MaxBudget = 25000,
                Urgency = UrgencyLevel.Normal,
                Latitude = 41.0082,
                Longitude = 28.9784,
                Address = "İstanbul, Türkiye"
            };

            var createNeedResponse = await _client.PostAsync("/api/need",
                new StringContent(JsonSerializer.Serialize(createNeedRequest), Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.OK, createNeedResponse.StatusCode);
            var createdNeed = JsonSerializer.Deserialize<NeedResponse>(
                await createNeedResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            // 4. Provider searches for needs
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", providerAuthResult.Token);

            var searchResponse = await _client.GetAsync("/api/need");
            Assert.Equal(HttpStatusCode.OK, searchResponse.StatusCode);

            var needs = JsonSerializer.Deserialize<List<NeedResponse>>(
                await searchResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.Contains(needs, n => n.Id == createdNeed.Id);

            // 5. Provider creates an offer
            var createOfferRequest = new CreateOfferRequest
            {
                NeedId = createdNeed.Id,
                Price = 22000,
                Description = "Sıfır kutusunda iPhone 13 Pro 128GB",
                DeliveryDays = 1
            };

            var createOfferResponse = await _client.PostAsync("/api/offer",
                new StringContent(JsonSerializer.Serialize(createOfferRequest), Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.OK, createOfferResponse.StatusCode);
            var createdOffer = JsonSerializer.Deserialize<OfferResponse>(
                await createOfferResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            // 6. Buyer views offers for their need
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerAuthResult.Token);

            var offersResponse = await _client.GetAsync($"/api/offer/need/{createdNeed.Id}");
            Assert.Equal(HttpStatusCode.OK, offersResponse.StatusCode);

            var offers = JsonSerializer.Deserialize<List<OfferResponse>>(
                await offersResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.Contains(offers, o => o.Id == createdOffer.Id);

            // 7. Buyer accepts the offer
            var acceptOfferResponse = await _client.PostAsync($"/api/offer/{createdOffer.Id}/accept", null);
            Assert.Equal(HttpStatusCode.OK, acceptOfferResponse.StatusCode);

            // 8. Verify offer status changed
            var updatedOfferResponse = await _client.GetAsync($"/api/offer/{createdOffer.Id}");
            Assert.Equal(HttpStatusCode.OK, updatedOfferResponse.StatusCode);

            var updatedOffer = JsonSerializer.Deserialize<OfferResponse>(
                await updatedOfferResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.Equal(OfferStatus.Accepted, updatedOffer.Status);
        }

        [Fact]
        public async Task MessagingFlow_SendAndReceiveMessages_ShouldWork()
        {
            // Setup: Create users and offer
            var (buyerToken, providerToken, offerId) = await SetupUsersAndOffer();

            // 1. Provider sends message to buyer
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", providerToken);

            var sendMessageRequest = new SendMessageRequest
            {
                OfferId = offerId,
                Content = "Merhaba, iPhone hakkında detay verebilir misiniz?",
                Type = MessageType.Text
            };

            var sendMessageResponse = await _client.PostAsync("/api/message",
                new StringContent(JsonSerializer.Serialize(sendMessageRequest), Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.OK, sendMessageResponse.StatusCode);

            // 2. Buyer retrieves conversation
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerToken);

            var conversationResponse = await _client.GetAsync($"/api/message/conversation/{offerId}");
            Assert.Equal(HttpStatusCode.OK, conversationResponse.StatusCode);

            var messages = JsonSerializer.Deserialize<List<MessageResponse>>(
                await conversationResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.Single(messages);
            Assert.Equal("Merhaba, iPhone hakkında detay verebilir misiniz?", messages[0].Content);

            // 3. Buyer replies
            var replyRequest = new SendMessageRequest
            {
                OfferId = offerId,
                Content = "Tabii, hangi renk ve kapasite istiyorsunuz?",
                Type = MessageType.Text
            };

            var replyResponse = await _client.PostAsync("/api/message",
                new StringContent(JsonSerializer.Serialize(replyRequest), Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.OK, replyResponse.StatusCode);

            // 4. Provider retrieves updated conversation
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", providerToken);

            var updatedConversationResponse = await _client.GetAsync($"/api/message/conversation/{offerId}");
            Assert.Equal(HttpStatusCode.OK, updatedConversationResponse.StatusCode);

            var updatedMessages = JsonSerializer.Deserialize<List<MessageResponse>>(
                await updatedConversationResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.Equal(2, updatedMessages.Count);
        }

        [Fact]
        public async Task FileUploadIntegration_UploadNeedImages_ShouldWork()
        {
            // Setup: Create user and need
            var (buyerToken, needId) = await SetupUserAndNeed();

            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerToken);

            // Create a test image file
            var imageContent = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }; // PNG header
            var form = new MultipartFormDataContent();
            form.Add(new ByteArrayContent(imageContent), "file", "test.png");

            // Upload image for need
            var uploadResponse = await _client.PostAsync($"/api/need/{needId}/images", form);
            Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);

            var uploadResult = JsonSerializer.Deserialize<FileUploadResponse>(
                await uploadResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.NotNull(uploadResult.Url);
            Assert.Contains("test.png", uploadResult.Url);

            // Verify image was associated with need
            var needResponse = await _client.GetAsync($"/api/need/{needId}");
            Assert.Equal(HttpStatusCode.OK, needResponse.StatusCode);

            var need = JsonSerializer.Deserialize<NeedResponse>(
                await needResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.Single(need.Images);
            Assert.Equal(uploadResult.Url, need.Images[0].ImageUrl);
        }

        [Fact]
        public async Task SearchAndFilterIntegration_ComplexFiltering_ShouldWork()
        {
            // Setup: Create multiple needs with different properties
            var (buyerToken, _) = await SetupUserAndNeed();

            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerToken);

            // Create needs with different categories and budgets
            var need1 = new CreateNeedRequest
            {
                Title = "Laptop Arıyorum",
                Description = "Gaming laptop",
                CategoryId = 1,
                MinBudget = 15000,
                MaxBudget = 20000,
                Urgency = UrgencyLevel.Normal,
                Latitude = 41.0082,
                Longitude = 28.9784
            };

            var need2 = new CreateNeedRequest
            {
                Title = "Telefon Arıyorum",
                Description = "Android telefon",
                CategoryId = 1,
                MinBudget = 5000,
                MaxBudget = 8000,
                Urgency = UrgencyLevel.Urgent,
                Latitude = 41.0082,
                Longitude = 28.9784
            };

            await _client.PostAsync("/api/need",
                new StringContent(JsonSerializer.Serialize(need1), Encoding.UTF8, "application/json"));
            await _client.PostAsync("/api/need",
                new StringContent(JsonSerializer.Serialize(need2), Encoding.UTF8, "application/json"));

            // Test category filtering
            var categoryFilterResponse = await _client.GetAsync("/api/need?categoryId=1");
            Assert.Equal(HttpStatusCode.OK, categoryFilterResponse.StatusCode);

            var categoryFilteredNeeds = JsonSerializer.Deserialize<List<NeedResponse>>(
                await categoryFilterResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.True(categoryFilteredNeeds.Count >= 2);

            // Test budget filtering
            var budgetFilterResponse = await _client.GetAsync("/api/need?minBudget=10000&maxBudget=25000");
            Assert.Equal(HttpStatusCode.OK, budgetFilterResponse.StatusCode);

            var budgetFilteredNeeds = JsonSerializer.Deserialize<List<NeedResponse>>(
                await budgetFilterResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.Contains(budgetFilteredNeeds, n => n.Title == "Laptop Arıyorum");
            Assert.DoesNotContain(budgetFilteredNeeds, n => n.Title == "Telefon Arıyorum");

            // Test text search
            var searchResponse = await _client.GetAsync("/api/need?search=laptop");
            Assert.Equal(HttpStatusCode.OK, searchResponse.StatusCode);

            var searchResults = JsonSerializer.Deserialize<List<NeedResponse>>(
                await searchResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.Contains(searchResults, n => n.Title.Contains("Laptop"));
        }

        private async Task<(string buyerToken, string providerToken, int offerId)> SetupUsersAndOffer()
        {
            // Register buyer
            var buyerRegisterRequest = new RegisterRequest
            {
                Email = $"buyer{Guid.NewGuid()}@test.com",
                Password = "Test123!",
                FirstName = "Test",
                LastName = "Buyer",
                UserType = UserType.Buyer
            };

            var buyerResponse = await _client.PostAsync("/api/auth/register",
                new StringContent(JsonSerializer.Serialize(buyerRegisterRequest), Encoding.UTF8, "application/json"));
            var buyerAuth = JsonSerializer.Deserialize<AuthResponse>(
                await buyerResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            // Register provider
            var providerRegisterRequest = new RegisterRequest
            {
                Email = $"provider{Guid.NewGuid()}@test.com",
                Password = "Test123!",
                FirstName = "Test",
                LastName = "Provider",
                UserType = UserType.Provider
            };

            var providerResponse = await _client.PostAsync("/api/auth/register",
                new StringContent(JsonSerializer.Serialize(providerRegisterRequest), Encoding.UTF8, "application/json"));
            var providerAuth = JsonSerializer.Deserialize<AuthResponse>(
                await providerResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            // Create need
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerAuth.Token);

            var createNeedRequest = new CreateNeedRequest
            {
                Title = "Test Need",
                Description = "Test Description",
                CategoryId = 1,
                MinBudget = 1000,
                MaxBudget = 2000,
                Urgency = UrgencyLevel.Normal
            };

            var needResponse = await _client.PostAsync("/api/need",
                new StringContent(JsonSerializer.Serialize(createNeedRequest), Encoding.UTF8, "application/json"));
            var need = JsonSerializer.Deserialize<NeedResponse>(
                await needResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            // Create offer
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", providerAuth.Token);

            var createOfferRequest = new CreateOfferRequest
            {
                NeedId = need.Id,
                Price = 1500,
                Description = "Test Offer",
                DeliveryDays = 1
            };

            var offerResponse = await _client.PostAsync("/api/offer",
                new StringContent(JsonSerializer.Serialize(createOfferRequest), Encoding.UTF8, "application/json"));
            var offer = JsonSerializer.Deserialize<OfferResponse>(
                await offerResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return (buyerAuth.Token, providerAuth.Token, offer.Id);
        }

        private async Task<(string buyerToken, int needId)> SetupUserAndNeed()
        {
            // Register buyer
            var buyerRegisterRequest = new RegisterRequest
            {
                Email = $"buyer{Guid.NewGuid()}@test.com",
                Password = "Test123!",
                FirstName = "Test",
                LastName = "Buyer",
                UserType = UserType.Buyer
            };

            var buyerResponse = await _client.PostAsync("/api/auth/register",
                new StringContent(JsonSerializer.Serialize(buyerRegisterRequest), Encoding.UTF8, "application/json"));
            var buyerAuth = JsonSerializer.Deserialize<AuthResponse>(
                await buyerResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            // Create need
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerAuth.Token);

            var createNeedRequest = new CreateNeedRequest
            {
                Title = "Test Need for Upload",
                Description = "Test Description",
                CategoryId = 1,
                MinBudget = 1000,
                MaxBudget = 2000,
                Urgency = UrgencyLevel.Normal
            };

            var needResponse = await _client.PostAsync("/api/need",
                new StringContent(JsonSerializer.Serialize(createNeedRequest), Encoding.UTF8, "application/json"));
            var need = JsonSerializer.Deserialize<NeedResponse>(
                await needResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return (buyerAuth.Token, need.Id);
        }
    }

    // Response DTOs for testing
    public class FileUploadResponse
    {
        public string Url { get; set; }
        public string FileName { get; set; }
    }
}