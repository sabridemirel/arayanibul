using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using API.Models;

namespace API.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Category> Categories { get; set; }
    public DbSet<Need> Needs { get; set; }
    public DbSet<NeedImage> NeedImages { get; set; }
    public DbSet<Offer> Offers { get; set; }
    public DbSet<OfferImage> OfferImages { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<Review> Reviews { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<SearchHistory> SearchHistories { get; set; }
    public DbSet<UserBehavior> UserBehaviors { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Category relationships
        builder.Entity<Category>()
            .HasOne(c => c.ParentCategory)
            .WithMany(c => c.SubCategories)
            .HasForeignKey(c => c.ParentCategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // Need relationships
        builder.Entity<Need>()
            .HasOne(n => n.User)
            .WithMany(u => u.Needs)
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Need>()
            .HasOne(n => n.Category)
            .WithMany(c => c.Needs)
            .HasForeignKey(n => n.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // NeedImage relationships
        builder.Entity<NeedImage>()
            .HasOne(ni => ni.Need)
            .WithMany(n => n.Images)
            .HasForeignKey(ni => ni.NeedId)
            .OnDelete(DeleteBehavior.Cascade);

        // Offer relationships
        builder.Entity<Offer>()
            .HasOne(o => o.Need)
            .WithMany(n => n.Offers)
            .HasForeignKey(o => o.NeedId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Offer>()
            .HasOne(o => o.Provider)
            .WithMany(u => u.Offers)
            .HasForeignKey(o => o.ProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        // OfferImage relationships
        builder.Entity<OfferImage>()
            .HasOne(oi => oi.Offer)
            .WithMany(o => o.Images)
            .HasForeignKey(oi => oi.OfferId)
            .OnDelete(DeleteBehavior.Cascade);

        // Message relationships
        builder.Entity<Message>()
            .HasOne(m => m.Offer)
            .WithMany(o => o.Messages)
            .HasForeignKey(m => m.OfferId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Message>()
            .HasOne(m => m.Sender)
            .WithMany(u => u.SentMessages)
            .HasForeignKey(m => m.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        // Review relationships
        builder.Entity<Review>()
            .HasOne(r => r.Reviewer)
            .WithMany(u => u.GivenReviews)
            .HasForeignKey(r => r.ReviewerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Review>()
            .HasOne(r => r.Reviewee)
            .WithMany(u => u.ReceivedReviews)
            .HasForeignKey(r => r.RevieweeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Entity<Review>()
            .HasOne(r => r.Offer)
            .WithMany()
            .HasForeignKey(r => r.OfferId)
            .OnDelete(DeleteBehavior.SetNull);

        // Decimal precision configuration
        builder.Entity<Need>()
            .Property(n => n.MinBudget)
            .HasPrecision(18, 2);

        builder.Entity<Need>()
            .Property(n => n.MaxBudget)
            .HasPrecision(18, 2);

        builder.Entity<Offer>()
            .Property(o => o.Price)
            .HasPrecision(18, 2);

        // Index configurations for performance
        builder.Entity<Need>()
            .HasIndex(n => new { n.CategoryId, n.Status, n.CreatedAt })
            .HasDatabaseName("IX_Needs_CategoryId_Status_CreatedAt");

        builder.Entity<Need>()
            .HasIndex(n => new { n.Latitude, n.Longitude })
            .HasDatabaseName("IX_Needs_Location")
            .HasFilter("Latitude IS NOT NULL AND Longitude IS NOT NULL");

        builder.Entity<Offer>()
            .HasIndex(o => new { o.NeedId, o.Status })
            .HasDatabaseName("IX_Offers_NeedId_Status");

        builder.Entity<Message>()
            .HasIndex(m => new { m.OfferId, m.CreatedAt })
            .HasDatabaseName("IX_Messages_OfferId_CreatedAt");

        builder.Entity<Review>()
            .HasIndex(r => new { r.RevieweeId, r.IsVisible })
            .HasDatabaseName("IX_Reviews_RevieweeId_IsVisible");

        // RefreshToken relationships
        builder.Entity<RefreshToken>()
            .HasOne(rt => rt.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<RefreshToken>()
            .HasIndex(rt => rt.Token)
            .IsUnique()
            .HasDatabaseName("IX_RefreshTokens_Token");

        builder.Entity<RefreshToken>()
            .HasIndex(rt => new { rt.UserId, rt.IsRevoked, rt.ExpiryDate })
            .HasDatabaseName("IX_RefreshTokens_UserId_IsRevoked_ExpiryDate");

        // Notification relationships
        builder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany(u => u.Notifications)
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<Notification>()
            .HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt })
            .HasDatabaseName("IX_Notifications_UserId_IsRead_CreatedAt");

        // SearchHistory relationships
        builder.Entity<SearchHistory>()
            .HasOne(sh => sh.User)
            .WithMany()
            .HasForeignKey(sh => sh.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Entity<SearchHistory>()
            .HasIndex(sh => new { sh.UserId, sh.CreatedAt })
            .HasDatabaseName("IX_SearchHistories_UserId_CreatedAt");

        builder.Entity<SearchHistory>()
            .HasIndex(sh => new { sh.SearchText, sh.CreatedAt })
            .HasDatabaseName("IX_SearchHistories_SearchText_CreatedAt");

        // UserBehavior relationships
        builder.Entity<UserBehavior>()
            .HasOne(ub => ub.User)
            .WithMany()
            .HasForeignKey(ub => ub.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<UserBehavior>()
            .HasIndex(ub => new { ub.UserId, ub.ActionType, ub.CreatedAt })
            .HasDatabaseName("IX_UserBehaviors_UserId_ActionType_CreatedAt");

        builder.Entity<UserBehavior>()
            .HasIndex(ub => new { ub.TargetId, ub.TargetType, ub.CreatedAt })
            .HasDatabaseName("IX_UserBehaviors_TargetId_TargetType_CreatedAt");
    }
}