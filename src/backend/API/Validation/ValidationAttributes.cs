using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace API.Validation;

/// <summary>
/// Validates that a string contains only safe characters and doesn't contain potential XSS or injection patterns
/// </summary>
public class SafeStringAttribute : ValidationAttribute
{
    private static readonly Regex UnsafePatterns = new(
        @"<script|</script|javascript:|vbscript:|onload=|onerror=|onclick=|<iframe|<object|<embed|<link|<meta|<style|eval\(|expression\(",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex SqlInjectionPatterns = new(
        @"(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT( +INTO)?|MERGE|SELECT|UPDATE|UNION( +ALL)?)\b)|('|('')|;|--|\*|\|)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public override bool IsValid(object? value)
    {
        if (value == null || value is not string stringValue)
            return true;

        // Check for XSS patterns
        if (UnsafePatterns.IsMatch(stringValue))
        {
            ErrorMessage = "Güvenlik nedeniyle bu karakterler kullanılamaz.";
            return false;
        }

        // Check for SQL injection patterns
        if (SqlInjectionPatterns.IsMatch(stringValue))
        {
            ErrorMessage = "Güvenlik nedeniyle bu karakterler kullanılamaz.";
            return false;
        }

        return true;
    }
}

/// <summary>
/// Validates Turkish phone number format
/// </summary>
public class TurkishPhoneAttribute : ValidationAttribute
{
    private static readonly Regex PhoneRegex = new(
        @"^(\+90|0)?[5][0-9]{9}$",
        RegexOptions.Compiled);

    public override bool IsValid(object? value)
    {
        if (value == null || value is not string phone)
            return true;

        if (!PhoneRegex.IsMatch(phone))
        {
            ErrorMessage = "Geçerli bir telefon numarası giriniz (örn: 05551234567)";
            return false;
        }

        return true;
    }
}

/// <summary>
/// Validates that decimal values are within reasonable bounds for prices
/// </summary>
public class PriceRangeAttribute : ValidationAttribute
{
    private readonly decimal _minimum;
    private readonly decimal _maximum;

    public PriceRangeAttribute(double minimum = 0, double maximum = 1000000)
    {
        _minimum = (decimal)minimum;
        _maximum = (decimal)maximum;
    }

    public override bool IsValid(object? value)
    {
        if (value == null)
            return true;

        if (value is decimal decimalValue)
        {
            if (decimalValue < _minimum || decimalValue > _maximum)
            {
                ErrorMessage = $"Fiyat {_minimum:C} ile {_maximum:C} arasında olmalıdır.";
                return false;
            }
        }

        return true;
    }
}

/// <summary>
/// Validates coordinate values for latitude and longitude
/// </summary>
public class CoordinateAttribute : ValidationAttribute
{
    private readonly CoordinateType _type;

    public CoordinateAttribute(CoordinateType type)
    {
        _type = type;
    }

    public override bool IsValid(object? value)
    {
        if (value == null)
            return true;

        if (value is not double coordinate)
            return false;

        return _type switch
        {
            CoordinateType.Latitude => coordinate >= -90 && coordinate <= 90,
            CoordinateType.Longitude => coordinate >= -180 && coordinate <= 180,
            _ => false
        };
    }
}

public enum CoordinateType
{
    Latitude,
    Longitude
}

/// <summary>
/// Validates file upload size and type
/// </summary>
public class FileValidationAttribute : ValidationAttribute
{
    private readonly long _maxSizeBytes;
    private readonly string[] _allowedExtensions;

    public FileValidationAttribute(long maxSizeMB = 5, params string[] allowedExtensions)
    {
        _maxSizeBytes = maxSizeMB * 1024 * 1024;
        _allowedExtensions = allowedExtensions.Length > 0 ? allowedExtensions : new[] { ".jpg", ".jpeg", ".png", ".gif" };
    }

    public override bool IsValid(object? value)
    {
        if (value == null)
            return true;

        if (value is not IFormFile file)
            return false;

        // Check file size
        if (file.Length > _maxSizeBytes)
        {
            ErrorMessage = $"Dosya boyutu {_maxSizeBytes / (1024 * 1024)} MB'dan büyük olamaz.";
            return false;
        }

        // Check file extension
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!_allowedExtensions.Contains(extension))
        {
            ErrorMessage = $"Sadece şu dosya türleri kabul edilir: {string.Join(", ", _allowedExtensions)}";
            return false;
        }

        return true;
    }
}