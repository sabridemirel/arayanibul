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
    /// <summary>End of the "Acil İlanlar" showcase slot. Set when the need becomes Urgent;
    /// once it passes, the need drops back to Normal (see UrgentShowcaseExpiryService).</summary>
    public DateTime? UrgentUntil { get; set; }
    public NeedStatus Status { get; set; } = NeedStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    public string UserId { get; set; } = string.Empty;

    /// <summary>Set when the listing is for a catalogued product (see Product). Its price is
    /// MaxBudget; no new price column, so app versions that predate products show it as a budget.</summary>
    public int? ProductId { get; set; }
    public Product? Product { get; set; }

    /// <summary>"Bu fiyata hemen alırım": the buyer pays exactly MaxBudget and is closed to other prices.
    /// Sellers can only say "I sell at this price" (an offer with AtListedPrice) or ask to hear about a raise.</summary>
    public bool IsFixedPrice { get; set; }
    /// <summary>When the buyer was told that nobody has sold at their fixed price yet (once per listing).</summary>
    public DateTime? PriceNudgeSentAt { get; set; }

    // Moderation
    public NeedRejectionReason? RejectionReason { get; set; }
    public string? RejectionNote { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedById { get; set; }
    public DateTime? ApprovedAt { get; set; }
    /// <summary>Comma-joined terms that matched the keyword list / contact-info patterns.</summary>
    public string? FlaggedTerms { get; set; }
    /// <summary>True while the current content has not been approved by an admin
    /// (prevents re-activating an unreviewed listing by cancelling and re-opening it).</summary>
    public bool NeedsReview { get; set; }

    /// <summary>When followers of the category were told about this listing (once per listing).</summary>
    public DateTime? FollowersNotifiedAt { get; set; }
    
    // Navigation Properties
    public ApplicationUser User { get; set; } = null!;
    public Category Category { get; set; } = null!;
    public List<NeedImage> Images { get; set; } = new();
    public List<Offer> Offers { get; set; } = new();
    public List<NeedPriceWatch> PriceWatches { get; set; } = new();
}

/// <summary>A seller who found a fixed price too low and wants to hear when the buyer changes it.</summary>
public class NeedPriceWatch
{
    public int Id { get; set; }
    public int NeedId { get; set; }
    public Need Need { get; set; } = null!;
    public string UserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}