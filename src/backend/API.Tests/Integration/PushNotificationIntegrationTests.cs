using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Xunit;
using API.Models;
using API.Interfaces;
using Moq;
using System.Net;

namespace API.Tests.Integration
{
    public class PushNotificationIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly HttpClient _client;
        private readonly Mock<INotificationService> _mockNotificationService;

        public PushNotificationIntegrationTests(WebApplicationFactory<Program> factory)
        {
            _mockNotificationService = new Mock<INotificationService>();
            
            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Replace the real notification service with mock
                    var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(INotificationService));
                    if (descriptor != null)
                        services.Remove(descriptor);
                    
                    services.AddSingleton(_mockNotificationService.Object);
                });
            });
            
            _client = _factory.CreateClient();
        }

        [Fact]
        public async Task NewOfferNotification_WhenOfferCreated_ShouldSendNotification()
        {
            // Setup: Create buyer and need
            var (buyerToken, buyerId, needId) = await SetupBuyerAndNeed();

            // Setup: Create provider
            var providerToken = await SetupProvider();

            // Setup notification service mock
            _mockNotificationService
                .Setup(x => x.NotifyNewOfferAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>()))
                .Returns(Task.CompletedTask);

            // Create offer (this should trigger notification)
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", providerToken);

            var createOfferRequest = new CreateOfferRequest
            {
                NeedId = needId,
                Price = 1500,
                Description = "Test Offer for Notification",
                DeliveryDays = 1
            };

            var response = await _client.PostAsync("/api/offer",
                new StringContent(JsonSerializer.Serialize(createOfferRequest), Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            // Verify notification was sent
            _mockNotificationService.Verify(
                x => x.NotifyNewOfferAsync(buyerId, needId, It.IsAny<int>()),
                Times.Once);
        }

        [Fact]
        public async Task OfferAcceptedNotification_WhenOfferAccepted_ShouldSendNotification()
        {
            // Setup: Create complete offer scenario
            var (buyerToken, providerToken, providerId, offerId) = await SetupCompleteOfferScenario();

            // Setup notification service mock
            _mockNotificationService
                .Setup(x => x.NotifyOfferAcceptedAsync(It.IsAny<string>(), It.IsAny<int>()))
                .Returns(Task.CompletedTask);

            // Accept offer (this should trigger notification)
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerToken);

            var response = await _client.PostAsync($"/api/offer/{offerId}/accept", null);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            // Verify notification was sent
            _mockNotificationService.Verify(
                x => x.NotifyOfferAcceptedAsync(providerId, offerId),
                Times.Once);
        }

        [Fact]
        public async Task NewMessageNotification_WhenMessageSent_ShouldSendNotification()
        {
            // Setup: Create complete offer scenario
            var (buyerToken, providerToken, providerId, offerId) = await SetupCompleteOfferScenario();

            // Setup notification service mock
            _mockNotificationService
                .Setup(x => x.NotifyNewMessageAsync(It.IsAny<string>(), It.IsAny<int>()))
                .Returns(Task.CompletedTask);

            // Send message (this should trigger notification)
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", buyerToken);

            var sendMessageRequest = new SendMessageRequest
            {
                OfferId = offerId,
                Content = "Test message for notification",
                Type = MessageType.Text
            };

            var response = await _client.PostAsync("/api/message",
                new StringContent(JsonSerializer.Serialize(sendMessageRequest), Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            // Verify notification was sent to provider
            _mockNotificationService.Verify(
                x => x.NotifyNewMessageAsync(providerId, It.IsAny<int>()),
                Times.Once);
        }

        [Fact]
        public async Task NotificationHistory_GetUserNotifications_ShouldReturnNotifications()
        {
            // Setup: Create user
            var userToken = await SetupUser();

            // Setup notification service mock to return test notifications
            var testNotifications = new List<NotificationResponse>
            {
                new NotificationResponse
                {
                    Id = 1,
                    Title = "Yeni Teklif",
                    Body = "İhtiyacınıza yeni bir teklif geldi",
                    Type = "NewOffer",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                },
                new NotificationResponse
                {
                    Id = 2,
                    Title = "Teklif Kabul Edildi",
                    Body = "Teklifiniz kabul edildi",
                    Type = "OfferAccepted",
                    IsRead = true,
                    CreatedAt = DateTime.UtcNow.AddHours(-1)
                }
            };

            _mockNotificationService
                .Setup(x => x.GetUserNotificationsAsync(It.IsAny<string>()))
                .ReturnsAsync(testNotifications);

            // Get user notifications
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", userToken);

            var response = await _client.GetAsync("/api/notification");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var notifications = JsonSerializer.Deserialize<List<NotificationResponse>>(
                await response.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.Equal(2, notifications.Count);
            Assert.Contains(notifications, n => n.Title == "Yeni Teklif");
            Assert.Contains(notifications, n => n.Title == "Teklif Kabul Edildi");
        }

        [Fact]
        public async Task PushNotificationSettings_UpdateSettings_ShouldWork()
        {
            // Setup: Create user
            var userToken = await SetupUser();

            // Update notification settings
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", userToken);

            var updateSettingsRequest = new UpdateNotificationSettingsRequest
            {
                EnableNewOfferNotifications = true,
                EnableMessageNotifications = false,
                EnableOfferAcceptedNotifications = true
            };

            var response = await _client.PutAsync("/api/notification/settings",
                new StringContent(JsonSerializer.Serialize(updateSettingsRequest), Encoding.UTF8, "application/json"));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            // Verify settings were updated
            var getSettingsResponse = await _client.GetAsync("/api/notification/settings");
            Assert.Equal(HttpStatusCode.OK, getSettingsResponse.StatusCode);

            var settings = JsonSerializer.Deserialize<NotificationSettingsResponse>(
                await getSettingsResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.True(settings.EnableNewOfferNotifications);
            Assert.False(settings.EnableMessageNotifications);
            Assert.True(settings.EnableOfferAcceptedNotifications);
        }

        private async Task<(string buyerToken, string buyerId, int needId)> SetupBuyerAndNeed()
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
                Title = "Test Need for Notification",
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

            return (buyerAuth.Token, buyerAuth.UserId, need.Id);
        }

        private async Task<string> SetupProvider()
        {
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

            return providerAuth.Token;
        }

        private async Task<string> SetupUser()
        {
            var userRegisterRequest = new RegisterRequest
            {
                Email = $"user{Guid.NewGuid()}@test.com",
                Password = "Test123!",
                FirstName = "Test",
                LastName = "User",
                UserType = UserType.Both
            };

            var userResponse = await _client.PostAsync("/api/auth/register",
                new StringContent(JsonSerializer.Serialize(userRegisterRequest), Encoding.UTF8, "application/json"));
            var userAuth = JsonSerializer.Deserialize<AuthResponse>(
                await userResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return userAuth.Token;
        }

        private async Task<(string buyerToken, string providerToken, string providerId, int offerId)> SetupCompleteOfferScenario()
        {
            // Setup buyer and need
            var (buyerToken, buyerId, needId) = await SetupBuyerAndNeed();

            // Setup provider
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

            // Create offer
            _client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", providerAuth.Token);

            var createOfferRequest = new CreateOfferRequest
            {
                NeedId = needId,
                Price = 1500,
                Description = "Test Offer",
                DeliveryDays = 1
            };

            var offerResponse = await _client.PostAsync("/api/offer",
                new StringContent(JsonSerializer.Serialize(createOfferRequest), Encoding.UTF8, "application/json"));
            var offer = JsonSerializer.Deserialize<OfferResponse>(
                await offerResponse.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return (buyerToken, providerAuth.Token, providerAuth.UserId, offer.Id);
        }
    }

    // Additional DTOs for testing
    public class NotificationResponse
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Body { get; set; }
        public string Type { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class UpdateNotificationSettingsRequest
    {
        public bool EnableNewOfferNotifications { get; set; }
        public bool EnableMessageNotifications { get; set; }
        public bool EnableOfferAcceptedNotifications { get; set; }
    }

    public class NotificationSettingsResponse
    {
        public bool EnableNewOfferNotifications { get; set; }
        public bool EnableMessageNotifications { get; set; }
        public bool EnableOfferAcceptedNotifications { get; set; }
    }
}