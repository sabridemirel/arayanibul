namespace API.Interfaces;

public interface IInputSanitizationService
{
    string SanitizeHtml(string input);
    string SanitizeForDatabase(string input);
    string SanitizeFileName(string fileName);
    bool IsValidEmail(string email);
    bool ContainsSuspiciousContent(string input);
}