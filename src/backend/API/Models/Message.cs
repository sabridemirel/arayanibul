namespace API.Models;

public class Message
{
    public int Id { get; set; }
    public int OfferId { get; set; }
    public string SenderId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public MessageType Type { get; set; } = MessageType.Text;
    public string? AttachmentUrl { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    public Offer Offer { get; set; } = null!;
    public ApplicationUser Sender { get; set; } = null!;
}