using Microsoft.AspNetCore.Identity;

namespace MobileApp.API.Models;

public class ApplicationUser : IdentityUser
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Provider { get; set; } // "Local", "Google", "Facebook", "Guest"
    public string? ProviderId { get; set; }
    public bool IsGuest { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
}