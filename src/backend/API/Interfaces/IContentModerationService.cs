namespace API.Interfaces;

public interface IContentModerationService
{
    /// <summary>Moderation:Enabled (default true). When false, new listings go live immediately.</summary>
    bool IsEnabled { get; }

    /// <summary>Moderation:AutoApproveClean (default true). When true, a listing whose text has no
    /// flagged terms goes live immediately; only flagged listings wait for an admin.</summary>
    bool AutoApproveClean { get; }

    Task<List<string>> GetKeywordsAsync();
    Task<List<string>> ReplaceKeywordsAsync(IEnumerable<string> keywords);

    /// <summary>Keyword, phone number and e-mail matches in the listing text.</summary>
    Task<List<string>> FindFlaggedTermsAsync(string? title, string? description);
}
