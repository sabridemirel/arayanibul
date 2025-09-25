using System.ComponentModel.DataAnnotations;

namespace API.Models;

public class CreateReviewRequest
{
    [Required]
    public string RevieweeId { get; set; } = string.Empty;
    
    public int? OfferId { get; set; }
    
    [Required]
    [Range(1, 5, ErrorMessage = "Rating must be between 1 and 5")]
    public int Rating { get; set; }
    
    [MaxLength(1000, ErrorMessage = "Comment cannot exceed 1000 characters")]
    public string? Comment { get; set; }
}

public class UpdateReviewRequest
{
    [Required]
    [Range(1, 5, ErrorMessage = "Rating must be between 1 and 5")]
    public int Rating { get; set; }
    
    [MaxLength(1000, ErrorMessage = "Comment cannot exceed 1000 characters")]
    public string? Comment { get; set; }
}

public class ReviewResponse
{
    public int Id { get; set; }
    public string ReviewerId { get; set; } = string.Empty;
    public string ReviewerName { get; set; } = string.Empty;
    public string? ReviewerProfileImage { get; set; }
    public string RevieweeId { get; set; } = string.Empty;
    public string RevieweeName { get; set; } = string.Empty;
    public int? OfferId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsVisible { get; set; }
}

public class UserRatingResponse
{
    public string UserId { get; set; } = string.Empty;
    public double AverageRating { get; set; }
    public int TotalReviews { get; set; }
    public List<ReviewResponse> RecentReviews { get; set; } = new();
}

public class ReviewFilterRequest
{
    public string? UserId { get; set; }
    public int? Rating { get; set; }
    public int? OfferId { get; set; }
    public bool? IsVisible { get; set; } = true;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}