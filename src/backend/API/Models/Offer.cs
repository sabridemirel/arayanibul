namespace API.Models;

public class Offer
{
    public int Id { get; set; }
    public int NeedId { get; set; }
    public string ProviderId { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "TRY";
    public string Description { get; set; } = string.Empty;
    public int DeliveryDays { get; set; }
    public OfferStatus Status { get; set; } = OfferStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    public Need Need { get; set; } = null!;
    public ApplicationUser Provider { get; set; } = null!;
    public List<OfferImage> Images { get; set; } = new();
    public List<Message> Messages { get; set; } = new();
}