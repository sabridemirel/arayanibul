using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Interfaces;
using API.Models;
using Microsoft.Extensions.Logging;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using System.Text.Json;

namespace API.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<NotificationService> _logger;
    private readonly IConfiguration _configuration;
    private readonly FirebaseMessaging _firebaseMessaging;

    public NotificationService(
        ApplicationDbContext context, 
        ILogger<NotificationService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        
        // Initialize Firebase if not already initialized
        if (FirebaseApp.DefaultInstance == null)
        {
            try
            {
                var firebaseConfigPath = _configuration["Firebase:ServiceAccountKeyPath"];
                if (!string.IsNullOrEmpty(firebaseConfigPath) && File.Exists(firebaseConfigPath))
                {
                    FirebaseApp.Create(new AppOptions()
                    {
                        Credential = GoogleCredential.FromFile(firebaseConfigPath)
                    });
                    _logger.LogInformation("Firebase initialized successfully");
                }
                else
                {
                    _logger.LogWarning("Firebase service account key not found. Push notifications will be logged only.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Firebase. Push notifications will be logged only.");
            }
        }
        
        _firebaseMessaging = FirebaseMessaging.DefaultInstance;
    }

    public async Task SendPushNotificationAsync(string userId, string title, string body, object? data = null)
    {
        try
        {
            // Get user's notification preferences and device token
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found for push notification", userId);
                return;
            }

            // Check if user has push notifications enabled
            if (!user.EnablePushNotifications)
            {
                _logger.LogInformation("Push notifications disabled for user {UserId}", userId);
                return;
            }

            // Store notification in database
            var notification = new API.Models.Notification
            {
                UserId = userId,
                Title = title,
                Body = body,
                Type = GetNotificationTypeFromData(data),
                Data = data != null ? JsonSerializer.Serialize(data) : null,
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Send push notification via Firebase
            await SendFirebasePushNotificationAsync(user, title, body, data);
            
            _logger.LogInformation("Push notification sent to user {UserId}: {Title}", userId, title);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending push notification to user {UserId}", userId);
        }
    }

    private async Task SendFirebasePushNotificationAsync(ApplicationUser user, string title, string body, object? data)
    {
        try
        {
            string? deviceToken = user.DevicePlatform?.ToLower() switch
            {
                "ios" => user.ApnsToken,
                "android" => user.FcmToken,
                _ => user.FcmToken ?? user.ApnsToken
            };

            if (string.IsNullOrEmpty(deviceToken))
            {
                _logger.LogWarning("No device token found for user {UserId}", user.Id);
                return;
            }

            if (_firebaseMessaging == null)
            {
                _logger.LogWarning("Firebase not initialized. Notification logged only for user {UserId}", user.Id);
                return;
            }

            var messageBuilder = new FirebaseAdmin.Messaging.Message()
            {
                Token = deviceToken,
                Notification = new FirebaseAdmin.Messaging.Notification()
                {
                    Title = title,
                    Body = body
                }
            };

            // Add custom data if provided
            if (data != null)
            {
                var dataDict = JsonSerializer.Deserialize<Dictionary<string, object>>(JsonSerializer.Serialize(data));
                messageBuilder.Data = dataDict?.ToDictionary(kvp => kvp.Key, kvp => kvp.Value?.ToString() ?? "");
            }

            // Platform-specific configuration
            if (user.DevicePlatform?.ToLower() == "ios")
            {
                messageBuilder.Apns = new ApnsConfig()
                {
                    Aps = new Aps()
                    {
                        Alert = new ApsAlert()
                        {
                            Title = title,
                            Body = body
                        },
                        Badge = await GetUnreadNotificationCountAsync(user.Id),
                        Sound = "default"
                    }
                };
            }
            else if (user.DevicePlatform?.ToLower() == "android")
            {
                messageBuilder.Android = new AndroidConfig()
                {
                    Notification = new AndroidNotification()
                    {
                        Title = title,
                        Body = body,
                        Icon = "ic_notification",
                        Color = "#FF6B35",
                        Sound = "default"
                    },
                    Priority = Priority.High
                };
            }

            var response = await _firebaseMessaging.SendAsync(messageBuilder);
            _logger.LogInformation("Firebase message sent successfully: {Response}", response);
        }
        catch (FirebaseMessagingException ex)
        {
            _logger.LogError(ex, "Firebase messaging error for user {UserId}: {ErrorCode}", user.Id, ex.ErrorCode);
            
            // Handle invalid token
            if (ex.ErrorCode == ErrorCode.InvalidArgument || ex.ErrorCode == ErrorCode.NotFound)
            {
                await InvalidateDeviceTokenAsync(user.Id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending Firebase push notification to user {UserId}", user.Id);
        }
    }

    private async Task InvalidateDeviceTokenAsync(string userId)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user != null)
            {
                user.FcmToken = null;
                user.ApnsToken = null;
                user.DevicePlatform = null;
                await _context.SaveChangesAsync();
                _logger.LogInformation("Invalidated device tokens for user {UserId}", userId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error invalidating device tokens for user {UserId}", userId);
        }
    }

    private string GetNotificationTypeFromData(object? data)
    {
        if (data == null) return "system";
        
        try
        {
            var dataDict = JsonSerializer.Deserialize<Dictionary<string, object>>(JsonSerializer.Serialize(data));
            if (dataDict?.TryGetValue("type", out var typeValue) == true)
            {
                return typeValue?.ToString() ?? "system";
            }
        }
        catch
        {
            // Ignore serialization errors
        }
        
        return "system";
    }

    public async Task NotifyNewOfferAsync(string buyerId, int needId, int offerId)
    {
        try
        {
            // Check if user has offer notifications enabled
            var buyer = await _context.Users.FirstOrDefaultAsync(u => u.Id == buyerId);
            if (buyer == null || !buyer.EnableOfferNotifications)
            {
                _logger.LogInformation("Offer notifications disabled for user {BuyerId}", buyerId);
                return;
            }

            // Get offer details for notification
            var offer = await _context.Offers
                .Include(o => o.Need)
                .Include(o => o.Provider)
                .FirstOrDefaultAsync(o => o.Id == offerId);

            if (offer == null)
            {
                _logger.LogWarning("Offer {OfferId} not found for notification", offerId);
                return;
            }

            var title = "Yeni Teklif Aldınız!";
            var body = $"{offer.Provider.FirstName} {offer.Provider.LastName} '{offer.Need.Title}' ihtiyacınız için {offer.Price:C} {offer.Currency} teklif verdi.";
            
            var data = new
            {
                type = "new_offer",
                offerId = offerId,
                needId = needId,
                providerId = offer.ProviderId,
                price = offer.Price,
                currency = offer.Currency
            };

            await SendPushNotificationAsync(buyerId, title, body, data);
            
            _logger.LogInformation("New offer notification sent to buyer {BuyerId} for offer {OfferId}", buyerId, offerId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending new offer notification for offer {OfferId}", offerId);
        }
    }

    public async Task NotifyOfferAcceptedAsync(string providerId, int offerId)
    {
        try
        {
            // Check if user has offer notifications enabled
            var provider = await _context.Users.FirstOrDefaultAsync(u => u.Id == providerId);
            if (provider == null || !provider.EnableOfferNotifications)
            {
                _logger.LogInformation("Offer notifications disabled for user {ProviderId}", providerId);
                return;
            }

            // Get offer details for notification
            var offer = await _context.Offers
                .Include(o => o.Need)
                .Include(o => o.Need.User)
                .FirstOrDefaultAsync(o => o.Id == offerId);

            if (offer == null)
            {
                _logger.LogWarning("Offer {OfferId} not found for notification", offerId);
                return;
            }

            var title = "Teklifiniz Kabul Edildi!";
            var body = $"'{offer.Need.Title}' için verdiğiniz {offer.Price:C} {offer.Currency} teklif kabul edildi. Müşteri ile iletişime geçebilirsiniz.";
            
            var data = new
            {
                type = "offer_accepted",
                offerId = offerId,
                needId = offer.NeedId,
                buyerId = offer.Need.UserId,
                price = offer.Price,
                currency = offer.Currency
            };

            await SendPushNotificationAsync(providerId, title, body, data);
            
            _logger.LogInformation("Offer accepted notification sent to provider {ProviderId} for offer {OfferId}", providerId, offerId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending offer accepted notification for offer {OfferId}", offerId);
        }
    }

    public async Task NotifyOfferRejectedAsync(string providerId, int offerId, string? reason = null)
    {
        try
        {
            // Get offer details for notification
            var offer = await _context.Offers
                .Include(o => o.Need)
                .FirstOrDefaultAsync(o => o.Id == offerId);

            if (offer == null)
            {
                _logger.LogWarning("Offer {OfferId} not found for notification", offerId);
                return;
            }

            var title = "Teklifiniz Reddedildi";
            var body = $"'{offer.Need.Title}' için verdiğiniz teklif reddedildi.";
            
            if (!string.IsNullOrEmpty(reason))
            {
                body += $" Sebep: {reason}";
            }
            
            var data = new
            {
                type = "offer_rejected",
                offerId = offerId,
                needId = offer.NeedId,
                reason = reason
            };

            await SendPushNotificationAsync(providerId, title, body, data);
            
            _logger.LogInformation("Offer rejected notification sent to provider {ProviderId} for offer {OfferId}", providerId, offerId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending offer rejected notification for offer {OfferId}", offerId);
        }
    }

    public async Task NotifyOfferWithdrawnAsync(string buyerId, int offerId)
    {
        try
        {
            // Get offer details for notification
            var offer = await _context.Offers
                .Include(o => o.Need)
                .Include(o => o.Provider)
                .FirstOrDefaultAsync(o => o.Id == offerId);

            if (offer == null)
            {
                _logger.LogWarning("Offer {OfferId} not found for notification", offerId);
                return;
            }

            var title = "Teklif Geri Çekildi";
            var body = $"{offer.Provider.FirstName} {offer.Provider.LastName} '{offer.Need.Title}' için verdiği teklifi geri çekti.";
            
            var data = new
            {
                type = "offer_withdrawn",
                offerId = offerId,
                needId = offer.NeedId,
                providerId = offer.ProviderId
            };

            await SendPushNotificationAsync(buyerId, title, body, data);
            
            _logger.LogInformation("Offer withdrawn notification sent to buyer {BuyerId} for offer {OfferId}", buyerId, offerId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending offer withdrawn notification for offer {OfferId}", offerId);
        }
    }

    public async Task NotifyNewMessageAsync(string recipientId, int messageId)
    {
        try
        {
            // Check if user has message notifications enabled
            var recipient = await _context.Users.FirstOrDefaultAsync(u => u.Id == recipientId);
            if (recipient == null || !recipient.EnableMessageNotifications)
            {
                _logger.LogInformation("Message notifications disabled for user {RecipientId}", recipientId);
                return;
            }

            // Get message details for notification
            var message = await _context.Messages
                .Include(m => m.Sender)
                .Include(m => m.Offer)
                .Include(m => m.Offer.Need)
                .FirstOrDefaultAsync(m => m.Id == messageId);

            if (message == null)
            {
                _logger.LogWarning("Message {MessageId} not found for notification", messageId);
                return;
            }

            var title = "Yeni Mesaj";
            var body = $"{message.Sender.FirstName} {message.Sender.LastName} size mesaj gönderdi";
            
            // Add message preview for text messages
            if (message.Type == MessageType.Text && !string.IsNullOrEmpty(message.Content))
            {
                var preview = message.Content.Length > 50 ? message.Content.Substring(0, 47) + "..." : message.Content;
                body += $": {preview}";
            }
            else if (message.Type == MessageType.Image)
            {
                body += ": Fotoğraf gönderdi";
            }
            else if (message.Type == MessageType.Location)
            {
                body += ": Konum paylaştı";
            }
            
            var data = new
            {
                type = "new_message",
                messageId = messageId,
                offerId = message.OfferId,
                needId = message.Offer.NeedId,
                senderId = message.SenderId
            };

            await SendPushNotificationAsync(recipientId, title, body, data);
            
            _logger.LogInformation("New message notification sent to user {RecipientId} for message {MessageId}", recipientId, messageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending new message notification for message {MessageId}", messageId);
        }
    }

    public async Task<List<NotificationResponse>> GetUserNotificationsAsync(string userId, int page = 1, int pageSize = 20)
    {
        try
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(n => new NotificationResponse
                {
                    Id = n.Id,
                    Title = n.Title,
                    Body = n.Body,
                    Type = n.Type,
                    Data = !string.IsNullOrEmpty(n.Data) ? JsonSerializer.Deserialize<object>(n.Data, (JsonSerializerOptions?)null) : null,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt
                })
                .ToListAsync();

            return notifications;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notifications for user {UserId}", userId);
            return new List<NotificationResponse>();
        }
    }

    public async Task<bool> MarkNotificationAsReadAsync(int notificationId, string userId)
    {
        try
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

            if (notification == null)
            {
                _logger.LogWarning("Notification {NotificationId} not found for user {UserId}", notificationId, userId);
                return false;
            }

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Notification {NotificationId} marked as read for user {UserId}", notificationId, userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notification {NotificationId} as read for user {UserId}", notificationId, userId);
            return false;
        }
    }

    public async Task<int> GetUnreadNotificationCountAsync(string userId)
    {
        try
        {
            return await _context.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unread notification count for user {UserId}", userId);
            return 0;
        }
    }

    public async Task<bool> MarkAllNotificationsAsReadAsync(string userId)
    {
        try
        {
            var unreadNotifications = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var notification in unreadNotifications)
            {
                notification.IsRead = true;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("All notifications marked as read for user {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking all notifications as read for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> DeleteNotificationAsync(int notificationId, string userId)
    {
        try
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

            if (notification == null)
            {
                _logger.LogWarning("Notification {NotificationId} not found for user {UserId}", notificationId, userId);
                return false;
            }

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Notification {NotificationId} deleted for user {UserId}", notificationId, userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting notification {NotificationId} for user {UserId}", notificationId, userId);
            return false;
        }
    }

    public async Task<bool> UpdateDeviceTokenAsync(string userId, string token, string platform)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found for device token update", userId);
                return false;
            }

            user.DevicePlatform = platform.ToLower();
            
            if (platform.ToLower() == "ios")
            {
                user.ApnsToken = token;
            }
            else if (platform.ToLower() == "android")
            {
                user.FcmToken = token;
            }
            else
            {
                // Default to FCM for unknown platforms
                user.FcmToken = token;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Device token updated for user {UserId} on platform {Platform}", userId, platform);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating device token for user {UserId}", userId);
            return false;
        }
    }

    public async Task<NotificationPreferencesResponse> GetNotificationPreferencesAsync(string userId)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found for notification preferences", userId);
                return new NotificationPreferencesResponse();
            }

            return new NotificationPreferencesResponse
            {
                EnablePushNotifications = user.EnablePushNotifications,
                EnableOfferNotifications = user.EnableOfferNotifications,
                EnableMessageNotifications = user.EnableMessageNotifications,
                EnableSystemNotifications = user.EnableSystemNotifications
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification preferences for user {UserId}", userId);
            return new NotificationPreferencesResponse();
        }
    }

    public async Task<bool> UpdateNotificationPreferencesAsync(string userId, NotificationPreferencesRequest preferences)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found for notification preferences update", userId);
                return false;
            }

            user.EnablePushNotifications = preferences.EnablePushNotifications;
            user.EnableOfferNotifications = preferences.EnableOfferNotifications;
            user.EnableMessageNotifications = preferences.EnableMessageNotifications;
            user.EnableSystemNotifications = preferences.EnableSystemNotifications;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Notification preferences updated for user {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notification preferences for user {UserId}", userId);
            return false;
        }
    }

    public async Task<NotificationStatsResponse> GetNotificationStatsAsync(string userId)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var totalNotifications = await _context.Notifications
                .CountAsync(n => n.UserId == userId);

            var unreadNotifications = await _context.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);

            var todayNotifications = await _context.Notifications
                .CountAsync(n => n.UserId == userId && n.CreatedAt >= today && n.CreatedAt < tomorrow);

            return new NotificationStatsResponse
            {
                TotalNotifications = totalNotifications,
                UnreadNotifications = unreadNotifications,
                TodayNotifications = todayNotifications
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification stats for user {UserId}", userId);
            return new NotificationStatsResponse();
        }
    }
}