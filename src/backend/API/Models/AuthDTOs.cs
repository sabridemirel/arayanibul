using System.ComponentModel.DataAnnotations;
using API.Validation;

namespace API.Models;

public class LoginDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class RegisterDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    [MaxLength(100)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [SafeString]
    [MaxLength(50)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [SafeString]
    [MaxLength(50)]
    public string LastName { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Token { get; set; }
    public string? RefreshToken { get; set; }
    public UserDto? User { get; set; }
}

public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public bool IsGuest { get; set; }
}

public class GoogleLoginDto
{
    [Required]
    public string Token { get; set; } = string.Empty;
}

public class FacebookLoginDto
{
    [Required]
    public string Token { get; set; } = string.Empty;
}

public class ValidateTokenDto
{
    [Required]
    public string Token { get; set; } = string.Empty;
}

public class RefreshTokenDto
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

public class TokenResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class ConvertGuestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    [MaxLength(100)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [SafeString]
    [MaxLength(50)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [SafeString]
    [MaxLength(50)]
    public string LastName { get; set; } = string.Empty;
}