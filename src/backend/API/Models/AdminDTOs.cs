using System.ComponentModel.DataAnnotations;

namespace API.Models;

public class AdminStatsResponse
{
    public int PendingNeeds { get; set; }
    public int OpenReports { get; set; }
    public int SuspendedUsers { get; set; }
    public int ApprovedToday { get; set; }
    public int RejectedToday { get; set; }
}

public class AdminNeedUser
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int TotalNeeds { get; set; }
    public int RejectedNeeds { get; set; }
    public bool IsSuspended { get; set; }
}

public class AdminNeedImage
{
    public int Id { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
}

public class AdminNeedItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal? MinBudget { get; set; }
    public decimal? MaxBudget { get; set; }
    public string Currency { get; set; } = "TRY";
    public string? Address { get; set; }
    public UrgencyLevel Urgency { get; set; }
    public NeedStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public NeedRejectionReason? RejectionReason { get; set; }
    public string? RejectionReasonText { get; set; }
    public string? RejectionNote { get; set; }
    public List<string> FlaggedTerms { get; set; } = new();
    /// <summary>The category the listing's words point to, when it differs from CategoryName.</summary>
    public int? SuggestedCategoryId { get; set; }
    public string? SuggestedCategoryName { get; set; }
    public List<AdminNeedImage> Images { get; set; } = new();
    public AdminNeedUser User { get; set; } = new();
}

public class AdminChangeCategoryRequest
{
    [Required]
    public int? CategoryId { get; set; }
}

public class AdminApproveNeedRequest
{
    /// <summary>Optional: approve the listing under this category instead of the one it was filed under.</summary>
    public int? CategoryId { get; set; }
}

public class AdminRejectNeedRequest
{
    [Required]
    public NeedRejectionReason? Reason { get; set; }

    [MaxLength(500)]
    public string? Note { get; set; }
}

public class AdminReportReporter
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
}

public class AdminReportTarget
{
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public int? NeedId { get; set; }
    public int? OfferId { get; set; }
}

public class AdminReportItem
{
    public int Id { get; set; }
    public ReportTargetType TargetType { get; set; }
    public string TargetId { get; set; } = string.Empty;
    public ReportReason Reason { get; set; }
    public string ReasonText { get; set; } = string.Empty;
    public string? Note { get; set; }
    public ReportStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public AdminReportReporter Reporter { get; set; } = new();
    public AdminReportTarget Target { get; set; } = new();
    public DateTime? ResolvedAt { get; set; }
    public string? ResolutionNote { get; set; }
}

public class AdminResolveReportRequest
{
    [Required]
    public ReportResolutionAction? Action { get; set; }

    [MaxLength(500)]
    public string? Note { get; set; }
}

public class AdminUserItem
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsSuspended { get; set; }
    public string? SuspendedReason { get; set; }
    public int TotalNeeds { get; set; }
    public int RejectedNeeds { get; set; }
    public int ReportCount { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class AdminSuspendUserRequest
{
    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}

public class ModerationKeywordsDto
{
    [Required]
    public List<string> Keywords { get; set; } = new();
}

public class CreateReportRequest
{
    [Required]
    public ReportTargetType? TargetType { get; set; }

    [Required]
    [MaxLength(100)]
    public string TargetId { get; set; } = string.Empty;

    [Required]
    public ReportReason? Reason { get; set; }

    [MaxLength(500)]
    public string? Note { get; set; }
}

public class BlockedUserResponse
{
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateTime BlockedAt { get; set; }
}
