using API.Models;

namespace API.Interfaces;

public interface IOfferService
{
    // Core CRUD operations
    Task<OfferResponse> CreateOfferAsync(CreateOfferRequest request, string providerId);
    Task<OfferResponse?> GetOfferByIdAsync(int offerId, string? userId = null);
    Task<OfferResponse?> UpdateOfferAsync(int offerId, UpdateOfferRequest request, string providerId);
    Task<bool> DeleteOfferAsync(int offerId, string providerId);
    
    // Offer retrieval methods
    Task<PagedResult<OfferResponse>> GetOffersForNeedAsync(int needId, int page = 1, int pageSize = 20);
    Task<PagedResult<OfferResponse>> GetProviderOffersAsync(string providerId, OfferStatus? status = null, int page = 1, int pageSize = 20);
    Task<PagedResult<OfferResponse>> GetBuyerOffersAsync(string buyerId, OfferStatus? status = null, int page = 1, int pageSize = 20);
    Task<PagedResult<OfferResponse>> GetOffersAsync(OfferFilterRequest filter);
    
    // Offer status management
    Task<bool> AcceptOfferAsync(int offerId, string buyerId);
    Task<bool> RejectOfferAsync(int offerId, string buyerId, string? reason = null);
    Task<bool> WithdrawOfferAsync(int offerId, string providerId);
    
    // Business logic methods
    Task<bool> CanUserAccessOfferAsync(int offerId, string userId);
    Task<bool> CanProviderCreateOfferAsync(int needId, string providerId);
    Task<bool> CanBuyerManageOfferAsync(int offerId, string buyerId);
    Task<bool> CanProviderManageOfferAsync(int offerId, string providerId);
    
    // Statistics and analytics
    Task<OfferStatsResponse> GetOfferStatsForNeedAsync(int needId);
    Task<OfferStatsResponse> GetProviderOfferStatsAsync(string providerId);
    Task<List<OfferResponse>> GetTopOffersForNeedAsync(int needId, int maxResults = 5);
    
    // Notification triggers (will be used by notification service)
    Task NotifyNewOfferAsync(int offerId);
    Task NotifyOfferStatusChangeAsync(int offerId, OfferStatus newStatus);
}