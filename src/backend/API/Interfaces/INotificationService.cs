using API.Models;

namespace API.Interfaces;

public interface INotificationService
{
    // Push notification methods
    Task SendPushNotificationAsync(string userId, string title, string body, object? data = null);
    
    // Offer-specific notification methods
    Task NotifyNewOfferAsync(string buyerId, int needId, int offerId);
    Task NotifyOfferAcceptedAsync(string providerId, int offerId);
    Task NotifyOfferRejectedAsync(string providerId, int offerId, string? reason = null);
    Task NotifyOfferWithdrawnAsync(string buyerId, int offerId);
    
    // Message notification methods
    Task NotifyNewMessageAsync(string recipientId, int messageId);
    
    // General notification methods
    Task<List<NotificationResponse>> GetUserNotificationsAsync(string userId, int page = 1, int pageSize = 20);
    Task<bool> MarkNotificationAsReadAsync(int notificationId, string userId);
    Task<bool> MarkAllNotificationsAsReadAsync(string userId);
    Task<bool> DeleteNotificationAsync(int notificationId, string userId);
    Task<int> GetUnreadNotificationCountAsync(string userId);
    
    // Device token management
    Task<bool> UpdateDeviceTokenAsync(string userId, string token, string platform);
    
    // Notification preferences
    Task<NotificationPreferencesResponse> GetNotificationPreferencesAsync(string userId);
    Task<bool> UpdateNotificationPreferencesAsync(string userId, NotificationPreferencesRequest preferences);
    
    // Notification statistics
    Task<NotificationStatsResponse> GetNotificationStatsAsync(string userId);
}