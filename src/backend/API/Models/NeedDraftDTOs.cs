using System.ComponentModel.DataAnnotations;

namespace API.Models;

public class NeedDraftRequest
{
    /// <summary>What the user typed into the single "Ne arıyorsunuz?" box.</summary>
    [Required]
    [StringLength(2000, MinimumLength = 2)]
    public string Text { get; set; } = string.Empty;
}

/// <summary>
/// Listing fields suggested from one line of free text. Everything is a suggestion the user can
/// change before publishing; the listing itself is still created through POST /api/need.
/// </summary>
public class NeedDraftResponse
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>Null when no category could be recognised; the client then asks for one.</summary>
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? ParentCategoryName { get; set; }

    public decimal? MinBudget { get; set; }
    public decimal? MaxBudget { get; set; }

    /// <summary>City (and district when recognised), e.g. "Kadıköy, İstanbul".</summary>
    public string? Address { get; set; }

    /// <summary>Set when the text names a catalogued product: the client can send the buyer to
    /// its price page (/fiyat/{slug}) instead of creating an ordinary listing.</summary>
    public string? ProductSlug { get; set; }
    public string? ProductName { get; set; }

    /// <summary>One-tap questions for the recognised category (condition, warranty...).</summary>
    public List<NeedDraftQuestion> Questions { get; set; } = new();
}

public class NeedDraftQuestion
{
    /// <summary>Label written into the description, e.g. "Durum".</summary>
    public string Label { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    /// <summary>Option already implied by the text, if any.</summary>
    public string? Selected { get; set; }
}
