using System.ComponentModel.DataAnnotations;

namespace API.Models;

/// <summary>A keyword that flags a listing for closer review when found in its title/description.</summary>
public class ModerationKeyword
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Term { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>A user report about a listing, a message or another user.</summary>
public class Report
{
    public int Id { get; set; }

    [Required]
    public string ReporterId { get; set; } = string.Empty;

    public ReportTargetType TargetType { get; set; }

    [Required]
    [MaxLength(100)]
    public string TargetId { get; set; } = string.Empty;

    /// <summary>The user the reported content belongs to (need owner, message sender or the reported user).</summary>
    [MaxLength(450)]
    public string? TargetUserId { get; set; }

    public ReportReason Reason { get; set; }

    [MaxLength(500)]
    public string? Note { get; set; }

    public ReportStatus Status { get; set; } = ReportStatus.Open;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }

    [MaxLength(450)]
    public string? ResolvedById { get; set; }

    [MaxLength(500)]
    public string? ResolutionNote { get; set; }

    public ApplicationUser Reporter { get; set; } = null!;
}

/// <summary>BlockerId has blocked BlockedId.</summary>
public class UserBlock
{
    public int Id { get; set; }

    [Required]
    public string BlockerId { get; set; } = string.Empty;

    [Required]
    public string BlockedId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser Blocker { get; set; } = null!;
    public ApplicationUser Blocked { get; set; } = null!;
}

public static class AppRoles
{
    public const string Admin = "Admin";
}

/// <summary>Turkish labels shown to users and admins.</summary>
public static class ModerationLabels
{
    public static string For(NeedRejectionReason reason) => reason switch
    {
        NeedRejectionReason.ProhibitedItem => "Yasaklı ürün veya hizmet",
        NeedRejectionReason.Misleading => "Yanıltıcı veya eksik içerik",
        NeedRejectionReason.InappropriateLanguage => "Uygunsuz dil",
        NeedRejectionReason.ContactInfo => "İlanda iletişim bilgisi paylaşımı",
        NeedRejectionReason.Duplicate => "Tekrarlanan ilan",
        _ => "Diğer"
    };

    public static string? For(NeedRejectionReason? reason) => reason.HasValue ? For(reason.Value) : null;

    public static string For(ReportReason reason) => reason switch
    {
        ReportReason.Spam => "Spam veya reklam",
        ReportReason.Inappropriate => "Uygunsuz içerik",
        ReportReason.Fraud => "Dolandırıcılık şüphesi",
        ReportReason.Harassment => "Taciz veya hakaret",
        _ => "Diğer"
    };
}
