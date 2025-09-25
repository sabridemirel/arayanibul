using System.ComponentModel.DataAnnotations;

namespace API.Models;

public class SendMessageRequest
{
    [Required]
    public int OfferId { get; set; }
    
    [Required]
    [StringLength(1000, MinimumLength = 1)]
    public string Content { get; set; } = string.Empty;
    
    public MessageType Type { get; set; } = MessageType.Text;
    
    public string? AttachmentUrl { get; set; }
}

public class MessageDto
{
    public int Id { get; set; }
    public int OfferId { get; set; }
    public string SenderId { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string SenderProfileImage { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public MessageType Type { get; set; }
    public string? AttachmentUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsSentByCurrentUser { get; set; }
}

public class ConversationDto
{
    public int OfferId { get; set; }
    public int NeedId { get; set; }
    public string NeedTitle { get; set; } = string.Empty;
    public string OtherUserId { get; set; } = string.Empty;
    public string OtherUserName { get; set; } = string.Empty;
    public string OtherUserProfileImage { get; set; } = string.Empty;
    public MessageDto? LastMessage { get; set; }
    public int UnreadCount { get; set; }
    public DateTime LastActivity { get; set; }
    public decimal? OfferPrice { get; set; }
    public OfferStatus OfferStatus { get; set; }
}

public class MarkAsReadRequest
{
    [Required]
    public int MessageId { get; set; }
}

public class MarkConversationAsReadRequest
{
    [Required]
    public int OfferId { get; set; }
}