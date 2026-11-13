using API.Data;
using API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

/// <summary>
/// Keeps the "Admin" role in sync with the Admin:Emails configuration
/// (env ADMIN__EMAILS / Admin__Emails, comma or semicolon separated).
/// </summary>
public class AdminRoleService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AdminRoleService> _logger;

    public AdminRoleService(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IConfiguration configuration,
        ILogger<AdminRoleService> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _configuration = configuration;
        _logger = logger;
    }

    public HashSet<string> GetConfiguredAdminEmails()
    {
        var raw = _configuration["Admin:Emails"] ?? _configuration["ADMIN:EMAILS"] ?? string.Empty;
        return raw
            .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(e => e.ToLowerInvariant())
            .ToHashSet();
    }

    public async Task EnsureRoleExistsAsync()
    {
        if (!await _roleManager.RoleExistsAsync(AppRoles.Admin))
        {
            await _roleManager.CreateAsync(new IdentityRole(AppRoles.Admin));
        }
    }

    /// <summary>
    /// Adds the Admin role when the user's email is configured as an admin email AND ownership of
    /// that email has been proven (EmailConfirmed: password-reset link, email verification or a
    /// provider-verified social sign-in). Plain registration does not confirm the email, so nobody
    /// can claim the role by registering the admin's address first.
    /// </summary>
    public async Task EnsureAdminIfConfiguredAsync(ApplicationUser user)
    {
        if (user.IsGuest || !user.EmailConfirmed || string.IsNullOrEmpty(user.Email))
        {
            return;
        }

        var emails = GetConfiguredAdminEmails();
        if (!emails.Contains(user.Email.ToLowerInvariant()))
        {
            return;
        }

        await EnsureRoleExistsAsync();
        if (!await _userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            var result = await _userManager.AddToRoleAsync(user, AppRoles.Admin);
            if (result.Succeeded)
            {
                _logger.LogWarning("Granted Admin role to user {UserId} ({Email}) from Admin:Emails", user.Id, user.Email);
            }
        }
    }

    /// <summary>Startup: ensure the role exists and grant it to existing configured users.</summary>
    public async Task SyncConfiguredAdminsAsync()
    {
        await EnsureRoleExistsAsync();
        foreach (var email in GetConfiguredAdminEmails())
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user != null)
            {
                await EnsureAdminIfConfiguredAsync(user);
            }
        }
    }

    /// <summary>Startup: seed moderation keywords when the table is empty.</summary>
    public static async Task SeedModerationKeywordsAsync(ApplicationDbContext context)
    {
        if (await context.ModerationKeywords.AnyAsync())
        {
            return;
        }

        var terms = ContentModerationService.DefaultKeywords
            .Select(ContentModerationService.Normalize)
            .Distinct();
        context.ModerationKeywords.AddRange(terms.Select(t => new ModerationKeyword { Term = t }));
        await context.SaveChangesAsync();
    }
}
