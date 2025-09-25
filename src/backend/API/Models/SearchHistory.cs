namespace API.Models;

public class SearchHistory
{
    public int Id { get; set; }
    public string? UserId { get; set; } // Nullable for guest users
    public string SearchText { get; set; } = string.Empty;
    public string? Filters { get; set; } // JSON string of applied filters
    public int ResultCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    
    // Navigation Properties
    public ApplicationUser? User { get; set; }
}