using Microsoft.AspNetCore.Identity;

namespace API.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Address { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public UserType UserType { get; set; } = UserType.Both;
    public double Rating { get; set; } = 0.0;
    public int ReviewCount { get; set; } = 0;
    public string? Provider { get; set; } = "Local";
    public bool IsGuest { get; set; } = false;
    
    // Notification preferences
    public bool EnablePushNotifications { get; set; } = true;
    public bool EnableOfferNotifications { get; set; } = true;
    public bool EnableMessageNotifications { get; set; } = true;
    public bool EnableSystemNotifications { get; set; } = true;
    
    // Device tokens for push notifications
    public string? FcmToken { get; set; }
    public string? ApnsToken { get; set; }
    public string? DevicePlatform { get; set; } // "ios" or "android"

    // Verification badges
    public VerificationBadges VerificationBadges { get; set; } = VerificationBadges.None;

    // Navigation Properties
    public List<Need> Needs { get; set; } = new();
    public List<Offer> Offers { get; set; } = new();
    public List<Message> SentMessages { get; set; } = new();
    public List<Review> GivenReviews { get; set; } = new();
    public List<Review> ReceivedReviews { get; set; } = new();
    public List<RefreshToken> RefreshTokens { get; set; } = new();
    public List<Notification> Notifications { get; set; } = new();
    public List<UserVerification> Verifications { get; set; } = new();
}