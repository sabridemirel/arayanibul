using API.Data;
using API.Interfaces;
using API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace API.Services;

/// <summary>
/// Account deletion for store compliance. Users are anonymized rather than hard-deleted because
/// offers, messages, reviews and transactions (Restrict FKs) must stay intact for counterparties.
/// </summary>
public class AccountDeletionService : IAccountDeletionService
{
    public const string DeletedEmailDomain = "deleted.arayanibul.local";

    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IFileStorageService _fileStorageService;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<AccountDeletionService> _logger;

    public AccountDeletionService(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        IFileStorageService fileStorageService,
        IMemoryCache memoryCache,
        ILogger<AccountDeletionService> logger)
    {
        _context = context;
        _userManager = userManager;
        _fileStorageService = fileStorageService;
        _memoryCache = memoryCache;
        _logger = logger;
    }

    public async Task<bool> DeleteAccountAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return false;
        }

        var profileImageUrl = user.ProfileImageUrl;
        var now = DateTime.UtcNow;

        await using (var tx = await _context.Database.BeginTransactionAsync())
        {
            // Close the user's open needs
            var openNeeds = await _context.Needs
                .Where(n => n.UserId == userId && (n.Status == NeedStatus.Active || n.Status == NeedStatus.InProgress))
                .ToListAsync();
            foreach (var need in openNeeds)
            {
                need.Status = NeedStatus.Cancelled;
                need.UpdatedAt = now;
            }

            // Pending offers received on those needs can no longer be accepted
            var openNeedIds = openNeeds.Select(n => n.Id).ToList();
            var offersOnClosedNeeds = await _context.Offers
                .Where(o => openNeedIds.Contains(o.NeedId) && o.Status == OfferStatus.Pending)
                .ToListAsync();
            foreach (var offer in offersOnClosedNeeds)
            {
                offer.Status = OfferStatus.Rejected;
                offer.UpdatedAt = now;
            }

            // Withdraw the user's own pending offers
            var myPendingOffers = await _context.Offers
                .Where(o => o.ProviderId == userId && o.Status == OfferStatus.Pending)
                .ToListAsync();
            foreach (var offer in myPendingOffers)
            {
                offer.Status = OfferStatus.Withdrawn;
                offer.UpdatedAt = now;
            }

            await _context.SaveChangesAsync();

            // Personal data / sessions that nobody else needs
            await _context.RefreshTokens.Where(x => x.UserId == userId).ExecuteDeleteAsync();
            await _context.Notifications.Where(x => x.UserId == userId).ExecuteDeleteAsync();
            await _context.UserBehaviors.Where(x => x.UserId == userId).ExecuteDeleteAsync();
            await _context.SearchHistories.Where(x => x.UserId == userId).ExecuteDeleteAsync();
            await _context.UserVerifications.Where(x => x.UserId == userId).ExecuteDeleteAsync();
            await _context.UserLogins.Where(x => x.UserId == userId).ExecuteDeleteAsync();
            await _context.UserTokens.Where(x => x.UserId == userId).ExecuteDeleteAsync();
            await _context.UserClaims.Where(x => x.UserId == userId).ExecuteDeleteAsync();

            // Anonymize the account itself
            var anonymizedEmail = $"deleted-{user.Id}@{DeletedEmailDomain}";
            user.FirstName = "Silinmiş";
            user.LastName = "Kullanıcı";
            user.Email = anonymizedEmail;
            user.UserName = anonymizedEmail;
            user.NormalizedEmail = _userManager.NormalizeEmail(anonymizedEmail);
            user.NormalizedUserName = _userManager.NormalizeName(anonymizedEmail);
            user.EmailConfirmed = false;
            user.PhoneNumber = null;
            user.PhoneNumberConfirmed = false;
            user.TwoFactorEnabled = false;
            user.Address = null;
            user.Latitude = null;
            user.Longitude = null;
            user.ProfileImageUrl = null;
            user.FcmToken = null;
            user.ApnsToken = null;
            user.DevicePlatform = null;
            user.GoogleId = null;
            user.FacebookId = null;
            user.AppleId = null;
            user.VerificationBadges = VerificationBadges.None;
            user.EnablePushNotifications = false;
            user.PasswordHash = null; // remove password
            user.SecurityStamp = Guid.NewGuid().ToString();
            user.LockoutEnabled = true;
            user.LockoutEnd = DateTimeOffset.MaxValue;
            user.UpdatedAt = now;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                await tx.RollbackAsync();
                throw new InvalidOperationException(
                    "Account anonymization failed: " + string.Join(", ", result.Errors.Select(e => e.Code)));
            }

            await tx.CommitAsync();
        }

        // Make the JWT validation check see the deletion immediately
        _memoryCache.Remove(AuthCacheKeys.UserActive(userId));

        // File deletion is not transactional — do it after commit and never fail the request over it
        if (!string.IsNullOrEmpty(profileImageUrl))
        {
            try
            {
                await _fileStorageService.DeleteFileAsync(profileImageUrl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not delete profile image for deleted user {UserId}", userId);
            }
        }

        _logger.LogInformation("User account {UserId} deleted (anonymized)", userId);
        return true;
    }
}

public static class AuthCacheKeys
{
    public static string UserActive(string userId) => $"auth:user-active:{userId}";
}
