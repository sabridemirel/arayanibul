using System.ComponentModel.DataAnnotations;

namespace API.Models;

public class NotificationResponse
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public object? Data { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationPreferencesRequest
{
    public bool EnablePushNotifications { get; set; } = true;
    public bool EnableOfferNotifications { get; set; } = true;
    public bool EnableMessageNotifications { get; set; } = true;
    public bool EnableSystemNotifications { get; set; } = true;
}

public class NotificationPreferencesResponse
{
    public bool EnablePushNotifications { get; set; }
    public bool EnableOfferNotifications { get; set; }
    public bool EnableMessageNotifications { get; set; }
    public bool EnableSystemNotifications { get; set; }
}

public class PushNotificationRequest
{
    [Required]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Body { get; set; } = string.Empty;
    
    public object? Data { get; set; }
}

public class DeviceTokenRequest
{
    [Required]
    public string Token { get; set; } = string.Empty;
    
    [Required]
    public string Platform { get; set; } = string.Empty; // "ios" or "android"
}

public class NotificationStatsResponse
{
    public int TotalNotifications { get; set; }
    public int UnreadNotifications { get; set; }
    public int TodayNotifications { get; set; }
}