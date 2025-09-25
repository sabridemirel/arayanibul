namespace API.Models;

public class Review
{
    public int Id { get; set; }
    public string ReviewerId { get; set; } = string.Empty;
    public string RevieweeId { get; set; } = string.Empty;
    public int? OfferId { get; set; }
    public int Rating { get; set; } // 1-5 stars
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsVisible { get; set; } = true;
    
    // Navigation Properties
    public ApplicationUser Reviewer { get; set; } = null!;
    public ApplicationUser Reviewee { get; set; } = null!;
    public Offer? Offer { get; set; }
}