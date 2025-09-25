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