namespace API.Models;

public class NeedImage
{
    public int Id { get; set; }
    public int NeedId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public int SortOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    public Need Need { get; set; } = null!;
}