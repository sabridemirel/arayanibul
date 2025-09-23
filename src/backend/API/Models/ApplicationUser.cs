using Microsoft.AspNetCore.Identity;

namespace API.Models;

public class ApplicationUser : IdentityUser
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Provider { get; set; } = "Local";
    public bool IsGuest { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}