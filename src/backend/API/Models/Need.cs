namespace API.Models;

public class Need
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public decimal? MinBudget { get; set; }
    public decimal? MaxBudget { get; set; }
    public string Currency { get; set; } = "TRY";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Address { get; set; }
    public UrgencyLevel Urgency { get; set; } = UrgencyLevel.Normal;
    public NeedStatus Status { get; set; } = NeedStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    
    // Navigation Properties
    public ApplicationUser User { get; set; } = null!;
    public Category Category { get; set; } = null!;
    public List<NeedImage> Images { get; set; } = new();
    public List<Offer> Offers { get; set; } = new();
}