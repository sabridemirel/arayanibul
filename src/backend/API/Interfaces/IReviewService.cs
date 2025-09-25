using API.Models;

namespace API.Interfaces;

public interface IReviewService
{
    Task<ReviewResponse> CreateReviewAsync(CreateReviewRequest request, string reviewerId);
    Task<ReviewResponse?> GetReviewByIdAsync(int reviewId);
    Task<List<ReviewResponse>> GetReviewsAsync(ReviewFilterRequest filter);
    Task<List<ReviewResponse>> GetUserReviewsAsync(string userId, bool asReviewer = false);
    Task<UserRatingResponse> GetUserRatingAsync(string userId);
    Task<ReviewResponse> UpdateReviewAsync(int reviewId, UpdateReviewRequest request, string reviewerId);
    Task<bool> DeleteReviewAsync(int reviewId, string reviewerId);
    Task<bool> ModerateReviewAsync(int reviewId, bool isVisible);
    Task<bool> CanUserReviewAsync(string reviewerId, string revieweeId, int? offerId = null);
    Task UpdateUserRatingAsync(string userId);
}