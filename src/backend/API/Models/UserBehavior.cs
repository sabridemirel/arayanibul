namespace API.Models;

public class UserBehavior
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public UserActionType ActionType { get; set; }
    public string? TargetId { get; set; } // NeedId, OfferId, CategoryId, etc.
    public string? TargetType { get; set; } // "need", "offer", "category", "search"
    public string? Metadata { get; set; } // JSON string for additional data
    public DateTime CreatedAt { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    
    // Navigation Properties
    public ApplicationUser User { get; set; } = null!;
}

public enum UserActionType
{
    ViewNeed = 1,
    ViewOffer = 2,
    CreateNeed = 3,
    CreateOffer = 4,
    Search = 5,
    ViewCategory = 6,
    ContactProvider = 7,
    AcceptOffer = 8,
    RejectOffer = 9,
    ShareNeed = 10,
    SaveNeed = 11,
    ReportContent = 12
}