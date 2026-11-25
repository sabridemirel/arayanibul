using API.Models;

namespace API.Interfaces;

public interface ICategoryFollowService
{
    Task<CategoryFollowsResponse> GetFollowsAsync(string userId);

    /// <summary>Replaces the user's followed categories with the given set.</summary>
    Task<CategoryFollowsResponse> SetFollowsAsync(string userId, CategoryFollowsRequest request);

    /// <summary>
    /// Tells the followers of each newly published listing about it (in-app notification, plus an
    /// e-mail within the daily cap). Each listing is announced once. Returns how many listings were
    /// announced in this pass.
    /// </summary>
    Task<int> NotifyFollowersOfNewNeedsAsync();
}
