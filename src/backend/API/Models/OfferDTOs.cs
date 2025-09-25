using System.ComponentModel.DataAnnotations;

namespace API.Models;

public class CreateOfferRequest
{
    [Required]
    public int NeedId { get; set; }
    
    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0")]
    public decimal Price { get; set; }
    
    public string Currency { get; set; } = "TRY";
    
    [Required]
    [StringLength(2000, MinimumLength = 50, ErrorMessage = "Description must be between 50 and 2000 characters")]
    public string Description { get; set; } = string.Empty;
    
    [Required]
    [Range(1, 365, ErrorMessage = "Delivery days must be between 1 and 365")]
    public int DeliveryDays { get; set; }
    
    public List<string>? ImageUrls { get; set; }
}

public class UpdateOfferRequest
{
    [Range(0.01, double.MaxValue, ErrorMessage = "Price must be greater than 0")]
    public decimal? Price { get; set; }
    
    public string? Currency { get; set; }
    
    [StringLength(2000, MinimumLength = 50, ErrorMessage = "Description must be between 50 and 2000 characters")]
    public string? Description { get; set; }
    
    [Range(1, 365, ErrorMessage = "Delivery days must be between 1 and 365")]
    public int? DeliveryDays { get; set; }
    
    public OfferStatus? Status { get; set; }
    
    public List<string>? ImageUrls { get; set; }
}

public class OfferFilterRequest
{
    public int? NeedId { get; set; }
    public string? ProviderId { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public string? Currency { get; set; }
    public OfferStatus? Status { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public int? MaxDeliveryDays { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; } = "CreatedAt";
    public bool SortDescending { get; set; } = true;
}

public class OfferResponse
{
    public int Id { get; set; }
    public int NeedId { get; set; }
    public string NeedTitle { get; set; } = string.Empty;
    public string ProviderId { get; set; } = string.Empty;
    public string ProviderName { get; set; } = string.Empty;
    public string? ProviderProfileImageUrl { get; set; }
    public double ProviderRating { get; set; }
    public int ProviderReviewCount { get; set; }
    public decimal Price { get; set; }
    public string Currency { get; set; } = "TRY";
    public string Description { get; set; } = string.Empty;
    public int DeliveryDays { get; set; }
    public OfferStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<OfferImageResponse> Images { get; set; } = new();
    public int MessageCount { get; set; }
    public bool HasUnreadMessages { get; set; }
}

public class OfferImageResponse
{
    public int Id { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public int SortOrder { get; set; }
}

public class AcceptOfferRequest
{
    [Required]
    public int OfferId { get; set; }
}

public class RejectOfferRequest
{
    [Required]
    public int OfferId { get; set; }
    
    [StringLength(500)]
    public string? Reason { get; set; }
}

public class OfferStatsResponse
{
    public int TotalOffers { get; set; }
    public int PendingOffers { get; set; }
    public int AcceptedOffers { get; set; }
    public int RejectedOffers { get; set; }
    public decimal AveragePrice { get; set; }
    public double AverageDeliveryDays { get; set; }
}