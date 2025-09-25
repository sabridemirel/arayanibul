using System.ComponentModel.DataAnnotations;

namespace API.Models;

public class Notification
{
    public int Id { get; set; }
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(500)]
    public string Body { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;
    
    public string? Data { get; set; } // JSON string for additional data
    
    public bool IsRead { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    public ApplicationUser User { get; set; } = null!;
}

public enum NotificationType
{
    NewOffer,
    OfferAccepted,
    OfferRejected,
    OfferWithdrawn,
    NewMessage,
    NeedExpiring,
    System
}