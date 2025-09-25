namespace API.Models;

public class OfferImage
{
    public int Id { get; set; }
    public int OfferId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public int SortOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    public Offer Offer { get; set; } = null!;
}