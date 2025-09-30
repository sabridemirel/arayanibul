using System.ComponentModel.DataAnnotations;
using API.Validation;

namespace API.Models;

public class UpdateProfileRequest
{
    [SafeString]
    [MaxLength(50)]
    public string? FirstName { get; set; }

    [SafeString]
    [MaxLength(50)]
    public string? LastName { get; set; }

    [TurkishPhone]
    public string? PhoneNumber { get; set; }

    [SafeString]
    [MaxLength(200)]
    public string? Address { get; set; }

    [Coordinate(CoordinateType.Latitude)]
    public double? Latitude { get; set; }

    [Coordinate(CoordinateType.Longitude)]
    public double? Longitude { get; set; }

    public UserType? UserType { get; set; }
}

public class UserProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public UserType UserType { get; set; }
    public double Rating { get; set; }
    public int ReviewCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsGuest { get; set; }
}

public class UploadImageResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

/// <summary>
/// Full user statistics response including private financial data
/// Only returned for authenticated user's own statistics
/// </summary>
public class UserStatisticsResponse
{
    /// <summary>
    /// Number of needs created by the user
    /// </summary>
    public int NeedsCount { get; set; }

    /// <summary>
    /// Number of offers given by the user (as provider)
    /// </summary>
    public int OffersGivenCount { get; set; }

    /// <summary>
    /// Number of offers received on user's needs (as buyer)
    /// </summary>
    public int OffersReceivedCount { get; set; }

    /// <summary>
    /// Number of completed transactions
    /// </summary>
    public int CompletedTransactionsCount { get; set; }

    /// <summary>
    /// Total amount spent by the user
    /// </summary>
    public decimal TotalSpent { get; set; }

    /// <summary>
    /// Total amount earned by the user
    /// </summary>
    public decimal TotalEarned { get; set; }

    /// <summary>
    /// Average rating received (0 if no ratings)
    /// </summary>
    public double AverageRating { get; set; }

    /// <summary>
    /// Total number of reviews received
    /// </summary>
    public int ReviewCount { get; set; }

    /// <summary>
    /// User verification badges
    /// </summary>
    public VerificationBadges VerificationBadges { get; set; }

    /// <summary>
    /// Member since date
    /// </summary>
    public DateTime MemberSince { get; set; }
}

/// <summary>
/// Public user statistics response - only includes non-sensitive data
/// Can be accessed by any user without authentication
/// </summary>
public class PublicUserStatisticsResponse
{
    /// <summary>
    /// Number of completed transactions
    /// </summary>
    public int CompletedTransactionsCount { get; set; }

    /// <summary>
    /// Average rating received (0 if no ratings)
    /// </summary>
    public double AverageRating { get; set; }

    /// <summary>
    /// Total number of reviews received
    /// </summary>
    public int ReviewCount { get; set; }

    /// <summary>
    /// User verification badges
    /// </summary>
    public VerificationBadges VerificationBadges { get; set; }

    /// <summary>
    /// Member since date
    /// </summary>
    public DateTime MemberSince { get; set; }

    /// <summary>
    /// User type (Buyer, Provider, Both)
    /// </summary>
    public UserType UserType { get; set; }
}