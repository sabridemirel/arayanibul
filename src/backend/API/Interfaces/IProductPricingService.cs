using API.Models;

namespace API.Interfaces;

public interface IProductPricingService
{
    /// <summary>The catalogued product a piece of free text is about, if any (longest alias wins).</summary>
    Task<Product?> FindProductInTextAsync(string text);

    Task<List<ProductSummary>> SearchAsync(string? query);

    /// <summary>Everything the public price page shows; user-specific parts are filled when signed in.</summary>
    Task<ProductPageResponse?> GetPageAsync(string slug, string? userId);

    /// <summary>"Ben de arıyorum": creates, updates or renews the buyer's single listing for the product.</summary>
    Task<ProductBidResponse> PlaceBidAsync(string slug, string userId, ProductBidRequest request);

    /// <summary>"Bu fiyata satarım": offers the best available listing its own price.</summary>
    Task<ProductSellResponse> SellAtRealPriceAsync(string slug, string sellerId);

    /// <summary>Closes product listings whose buyer did not answer an at-price offer in time, or
    /// whose end date has passed. Returns how many were closed.</summary>
    Task<int> CloseStaleListingsAsync();

    /// <summary>Product listings keep their category and stay under the product's price ceiling,
    /// also when edited through the ordinary listing form (older app versions).</summary>
    Task EnsureEditAllowedAsync(Need need, UpdateNeedRequest request);

    /// <summary>
    /// The catalogued product a fixed-price listing with this title should count towards, or null when
    /// the title names none or the buyer already has a live listing for it. Throws when the price is above
    /// the product's ceiling.
    /// </summary>
    Task<Product?> FindLinkableProductAsync(string title, decimal price, string userId, int? excludeNeedId = null);

    /// <summary>How long a product listing stays live before it has to be renewed.</summary>
    int ListingLifetimeDays { get; }

    Task<List<Product>> GetAllProductsAsync();
    Task<Product> UpdateProductAsync(int productId, AdminProductRequest request);
}
