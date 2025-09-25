using System.Text.RegularExpressions;
using System.Web;

namespace API.Services;

public interface IInputSanitizationService
{
    string SanitizeHtml(string input);
    string SanitizeForDatabase(string input);
    string SanitizeFileName(string fileName);
    bool IsValidEmail(string email);
    bool ContainsSuspiciousContent(string input);
}

public class InputSanitizationService : IInputSanitizationService
{
    private static readonly Regex HtmlTagRegex = new(@"<[^>]*>", RegexOptions.Compiled);
    private static readonly Regex ScriptRegex = new(@"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SqlInjectionRegex = new(@"(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT( +INTO)?|MERGE|SELECT|UPDATE|UNION( +ALL)?)\b)|('|('')|;|--|\*|\|)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex EmailRegex = new(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", RegexOptions.Compiled);
    private static readonly Regex FileNameRegex = new(@"[<>:""/\\|?*\x00-\x1f]", RegexOptions.Compiled);

    private static readonly string[] SuspiciousPatterns = {
        "javascript:",
        "vbscript:",
        "onload=",
        "onerror=",
        "onclick=",
        "onmouseover=",
        "onfocus=",
        "onblur=",
        "onchange=",
        "onsubmit=",
        "eval(",
        "expression(",
        "url(",
        "import(",
        "document.cookie",
        "document.write",
        "window.location",
        "alert(",
        "confirm(",
        "prompt(",
        "<iframe",
        "<object",
        "<embed",
        "<link",
        "<meta",
        "<style",
        "<script",
        "</script>",
        "data:text/html",
        "data:application/javascript"
    };

    public string SanitizeHtml(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        // Remove script tags first
        var sanitized = ScriptRegex.Replace(input, string.Empty);
        
        // Remove all HTML tags
        sanitized = HtmlTagRegex.Replace(sanitized, string.Empty);
        
        // HTML decode to handle encoded malicious content
        sanitized = HttpUtility.HtmlDecode(sanitized);
        
        // HTML encode the result to make it safe for display
        sanitized = HttpUtility.HtmlEncode(sanitized);
        
        return sanitized.Trim();
    }

    public string SanitizeForDatabase(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        // Remove potential SQL injection patterns
        var sanitized = input.Trim();
        
        // Replace multiple spaces with single space
        sanitized = Regex.Replace(sanitized, @"\s+", " ");
        
        // Remove null characters
        sanitized = sanitized.Replace("\0", string.Empty);
        
        return sanitized;
    }

    public string SanitizeFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            return "file";

        // Remove invalid file name characters
        var sanitized = FileNameRegex.Replace(fileName, "_");
        
        // Remove leading/trailing dots and spaces
        sanitized = sanitized.Trim(' ', '.');
        
        // Ensure it's not empty after sanitization
        if (string.IsNullOrWhiteSpace(sanitized))
            sanitized = "file";
        
        // Limit length
        if (sanitized.Length > 255)
            sanitized = sanitized.Substring(0, 255);
        
        return sanitized;
    }

    public bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;

        try
        {
            // Use regex for basic validation
            if (!EmailRegex.IsMatch(email))
                return false;

            // Additional validation using MailAddress
            var mailAddress = new System.Net.Mail.MailAddress(email);
            return mailAddress.Address == email;
        }
        catch
        {
            return false;
        }
    }

    public bool ContainsSuspiciousContent(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return false;

        var lowerInput = input.ToLowerInvariant();
        
        // Check for suspicious patterns
        foreach (var pattern in SuspiciousPatterns)
        {
            if (lowerInput.Contains(pattern.ToLowerInvariant()))
                return true;
        }

        // Check for SQL injection patterns
        if (SqlInjectionRegex.IsMatch(input))
            return true;

        // Check for excessive special characters (potential obfuscation)
        var specialCharCount = input.Count(c => !char.IsLetterOrDigit(c) && !char.IsWhiteSpace(c));
        var specialCharRatio = (double)specialCharCount / input.Length;
        
        if (specialCharRatio > 0.3) // More than 30% special characters
            return true;

        return false;
    }
}