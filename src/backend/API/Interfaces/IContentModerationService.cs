namespace API.Interfaces;

public interface IContentModerationService
{
    /// <summary>Moderation:Enabled (default true). When false, new listings go live immediately.</summary>
    bool IsEnabled { get; }

    Task<List<string>> GetKeywordsAsync();
    Task<List<string>> ReplaceKeywordsAsync(IEnumerable<string> keywords);

    /// <summary>Keyword, phone number and e-mail matches in the listing text.</summary>
    Task<List<string>> FindFlaggedTermsAsync(string? title, string? description);
}
