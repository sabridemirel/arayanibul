namespace API.Interfaces;

public interface IAccountDeletionService
{
    /// <summary>
    /// Deletes (anonymizes) the user's account. Returns false if the user does not exist.
    /// </summary>
    Task<bool> DeleteAccountAsync(string userId);
}
