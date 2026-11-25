using System.ComponentModel.DataAnnotations;

namespace API.Models;

/// <summary>
/// A seller's subscription to a category: they are told when a new listing is published in it.
/// Following a root category covers its subcategories.
/// </summary>
public class CategoryFollow
{
    public int Id { get; set; }

    [Required]
    public string UserId { get; set; } = string.Empty;

    public int CategoryId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public Category Category { get; set; } = null!;
}

public class CategoryFollowsRequest
{
    /// <summary>The complete set of followed categories; anything not listed is unfollowed.</summary>
    [Required]
    public List<int> CategoryIds { get; set; } = new();

    /// <summary>Also send an e-mail for new listings (in-app notifications are always created).</summary>
    public bool EmailEnabled { get; set; } = true;
}

public class CategoryFollowsResponse
{
    public List<int> CategoryIds { get; set; } = new();
    public bool EmailEnabled { get; set; }
}
