using System.ComponentModel.DataAnnotations;

namespace API.Models;

/// <summary>
/// A specific, recognisable item (e.g. "RTX 3080") with its own public price page. Listings that
/// name it are grouped under it, and the page shows the highest price a buyer is offering right now.
/// </summary>
public class Product
{
    public int Id { get; set; }

    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    /// <summary>URL part of the price page: /fiyat/{slug}</summary>
    [Required]
    [MaxLength(120)]
    public string Slug { get; set; } = string.Empty;

    public int CategoryId { get; set; }

    /// <summary>
    /// Ways people write the name, separated by '|', lower-cased without Turkish diacritics
    /// ("rtx 3080|rtx3080|3080"). The longest alias found in a text decides the product.
    /// </summary>
    [MaxLength(500)]
    public string Aliases { get; set; } = string.Empty;

    /// <summary>Prices above this are refused (first guard against fake high prices). Set by an admin.</summary>
    public decimal? CeilingPrice { get; set; }

    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Category Category { get; set; } = null!;
}

// ---- API shapes

public class ProductSummary
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
    /// <summary>Highest price a buyer is offering right now; null when nobody has named a price.</summary>
    public decimal? RealPrice { get; set; }
    public int SeekerCount { get; set; }
}

public class ProductPageResponse : ProductSummary
{
    public List<ProductDeal> RecentDeals { get; set; } = new();
    public List<ProductSeeker> Seekers { get; set; } = new();
    /// <summary>Ready-made prices offered to a buyer (current top, last deal, one step above the top).</summary>
    public List<decimal> SuggestedPrices { get; set; } = new();
    /// <summary>The signed-in user's own listing for this product, if any.</summary>
    public ProductMyListing? MyListing { get; set; }
    /// <summary>What "bu fiyata satarım" would do for the signed-in user; null when there is nobody to sell to.</summary>
    public ProductSellTarget? SellTarget { get; set; }
    /// <summary>How long a buyer has to answer an at-price offer before their listing closes.</summary>
    public int ResponseDays { get; set; }
    public int ListingDays { get; set; }
}

public class ProductDeal
{
    public decimal Price { get; set; }
    public DateTime AgreedAt { get; set; }
}

public class ProductSeeker
{
    public int NeedId { get; set; }
    public decimal? Price { get; set; }
    public string? Address { get; set; }
    public DateTime CreatedAt { get; set; }
    /// <summary>A seller has already accepted this price and the buyer has not answered yet.</summary>
    public bool AwaitingBuyerResponse { get; set; }
}

public class ProductMyListing
{
    public int NeedId { get; set; }
    public decimal? Price { get; set; }
    /// <summary>1-based position among priced listings; null when the listing has no price.</summary>
    public int? Rank { get; set; }
    /// <summary>Price that would put this listing first; null when it already is.</summary>
    public decimal? PriceToLead { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class ProductSellTarget
{
    public int NeedId { get; set; }
    public decimal Price { get; set; }
    /// <summary>False when the top listing had to be skipped (own listing, block, or an offer already pending).</summary>
    public bool IsTopPrice { get; set; }
}

public class ProductBidRequest
{
    /// <summary>Price the buyer is ready to pay; null means "let sellers name the price".</summary>
    [Range(1, 1_000_000_000)]
    public decimal? Price { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }
}

public class ProductBidResponse
{
    public int NeedId { get; set; }
    public ProductPageResponse Page { get; set; } = new();
}

public class ProductSellResponse
{
    public int OfferId { get; set; }
    public int NeedId { get; set; }
    public decimal Price { get; set; }
}

public class AdminProductRequest
{
    [Range(1, 1_000_000_000)]
    public decimal? CeilingPrice { get; set; }
    public bool IsActive { get; set; } = true;
}
