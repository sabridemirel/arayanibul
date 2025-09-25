using System.ComponentModel.DataAnnotations;
using API.Validation;

namespace API.Models;

public class CreateNeedRequest
{
    [Required]
    [SafeString]
    [StringLength(200, MinimumLength = 5)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    [SafeString]
    [StringLength(2000, MinimumLength = 10)]
    public string Description { get; set; } = string.Empty;
    
    [Required]
    [Range(1, int.MaxValue)]
    public int CategoryId { get; set; }
    
    [PriceRange(0, 1000000)]
    public decimal? MinBudget { get; set; }
    
    [PriceRange(0, 1000000)]
    public decimal? MaxBudget { get; set; }
    
    [SafeString]
    [MaxLength(3)]
    public string Currency { get; set; } = "TRY";
    
    [Coordinate(CoordinateType.Latitude)]
    public double? Latitude { get; set; }
    
    [Coordinate(CoordinateType.Longitude)]
    public double? Longitude { get; set; }
    
    [StringLength(500)]
    public string? Address { get; set; }
    
    public UrgencyLevel Urgency { get; set; } = UrgencyLevel.Normal;
    
    public DateTime? ExpiresAt { get; set; }
    
    public List<string>? ImageUrls { get; set; }
}

public class UpdateNeedRequest
{
    [StringLength(200, MinimumLength = 5)]
    public string? Title { get; set; }
    
    [StringLength(2000, MinimumLength = 10)]
    public string? Description { get; set; }
    
    public int? CategoryId { get; set; }
    
    [Range(0, double.MaxValue)]
    public decimal? MinBudget { get; set; }
    
    [Range(0, double.MaxValue)]
    public decimal? MaxBudget { get; set; }
    
    public string? Currency { get; set; }
    
    [Range(-90, 90)]
    public double? Latitude { get; set; }
    
    [Range(-180, 180)]
    public double? Longitude { get; set; }
    
    [StringLength(500)]
    public string? Address { get; set; }
    
    public UrgencyLevel? Urgency { get; set; }
    
    public NeedStatus? Status { get; set; }
    
    public DateTime? ExpiresAt { get; set; }
    
    public List<string>? ImageUrls { get; set; }
}

public class NeedFilterRequest
{
    public int? CategoryId { get; set; }
    public List<int>? CategoryIds { get; set; }
    public decimal? MinBudget { get; set; }
    public decimal? MaxBudget { get; set; }
    public string? Currency { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? RadiusKm { get; set; } = 10;
    public UrgencyLevel? Urgency { get; set; }
    public NeedStatus? Status { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public string? SearchText { get; set; }
    public string? UserId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; } = "CreatedAt";
    public bool SortDescending { get; set; } = true;
}

public class NeedResponse
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal? MinBudget { get; set; }
    public decimal? MaxBudget { get; set; }
    public string Currency { get; set; } = "TRY";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Address { get; set; }
    public UrgencyLevel Urgency { get; set; }
    public NeedStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string? UserProfileImageUrl { get; set; }
    public List<NeedImageResponse> Images { get; set; } = new();
    public int OfferCount { get; set; }
    public double? DistanceKm { get; set; }
}

public class NeedImageResponse
{
    public int Id { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public int SortOrder { get; set; }
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}