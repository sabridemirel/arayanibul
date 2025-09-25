using API.Data;
using API.Interfaces;
using API.Models;
using API.Middleware;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

public class ReviewService : IReviewService
{
    private readonly ApplicationDbContext _context;

    public ReviewService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReviewResponse> CreateReviewAsync(CreateReviewRequest request, string reviewerId)
    {
        // Validate that reviewer and reviewee exist
        var reviewer = await _context.Users.FindAsync(reviewerId);
        if (reviewer == null)
            throw new UnauthorizedException("Reviewer not found");

        var reviewee = await _context.Users.FindAsync(request.RevieweeId);
        if (reviewee == null)
            throw new NotFoundException("Reviewee not found");

        // Check if user can review (not reviewing themselves, and if offer-based, they were part of the transaction)
        if (!await CanUserReviewAsync(reviewerId, request.RevieweeId, request.OfferId))
            throw new ValidationException(new Dictionary<string, string[]>
            {
                ["Review"] = new[] { "You cannot create this review" }
            });

        // Check if review already exists for this combination
        var existingReview = await _context.Reviews
            .FirstOrDefaultAsync(r => r.ReviewerId == reviewerId && 
                                    r.RevieweeId == request.RevieweeId && 
                                    r.OfferId == request.OfferId);

        if (existingReview != null)
            throw new ValidationException(new Dictionary<string, string[]>
            {
                ["Review"] = new[] { "You have already reviewed this user for this transaction" }
            });

        var review = new Review
        {
            ReviewerId = reviewerId,
            RevieweeId = request.RevieweeId,
            OfferId = request.OfferId,
            Rating = request.Rating,
            Comment = request.Comment,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsVisible = true
        };

        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();

        // Update user's average rating
        await UpdateUserRatingAsync(request.RevieweeId);

        return await GetReviewResponseAsync(review);
    }

    public async Task<ReviewResponse?> GetReviewByIdAsync(int reviewId)
    {
        var review = await _context.Reviews
            .Include(r => r.Reviewer)
            .Include(r => r.Reviewee)
            .FirstOrDefaultAsync(r => r.Id == reviewId);

        return review != null ? await GetReviewResponseAsync(review) : null;
    }

    public async Task<List<ReviewResponse>> GetReviewsAsync(ReviewFilterRequest filter)
    {
        var query = _context.Reviews
            .Include(r => r.Reviewer)
            .Include(r => r.Reviewee)
            .AsQueryable();

        if (!string.IsNullOrEmpty(filter.UserId))
            query = query.Where(r => r.RevieweeId == filter.UserId);

        if (filter.Rating.HasValue)
            query = query.Where(r => r.Rating == filter.Rating.Value);

        if (filter.OfferId.HasValue)
            query = query.Where(r => r.OfferId == filter.OfferId.Value);

        if (filter.IsVisible.HasValue)
            query = query.Where(r => r.IsVisible == filter.IsVisible.Value);

        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        var reviewResponses = new List<ReviewResponse>();
        foreach (var review in reviews)
        {
            reviewResponses.Add(await GetReviewResponseAsync(review));
        }

        return reviewResponses;
    }

    public async Task<List<ReviewResponse>> GetUserReviewsAsync(string userId, bool asReviewer = false)
    {
        var query = _context.Reviews
            .Include(r => r.Reviewer)
            .Include(r => r.Reviewee)
            .Where(r => r.IsVisible);

        if (asReviewer)
            query = query.Where(r => r.ReviewerId == userId);
        else
            query = query.Where(r => r.RevieweeId == userId);

        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var reviewResponses = new List<ReviewResponse>();
        foreach (var review in reviews)
        {
            reviewResponses.Add(await GetReviewResponseAsync(review));
        }

        return reviewResponses;
    }

    public async Task<UserRatingResponse> GetUserRatingAsync(string userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new NotFoundException("User not found");

        var reviews = await _context.Reviews
            .Include(r => r.Reviewer)
            .Include(r => r.Reviewee)
            .Where(r => r.RevieweeId == userId && r.IsVisible)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var recentReviews = new List<ReviewResponse>();
        foreach (var review in reviews.Take(5))
        {
            recentReviews.Add(await GetReviewResponseAsync(review));
        }

        return new UserRatingResponse
        {
            UserId = userId,
            AverageRating = user.Rating,
            TotalReviews = user.ReviewCount,
            RecentReviews = recentReviews
        };
    }

    public async Task<ReviewResponse> UpdateReviewAsync(int reviewId, UpdateReviewRequest request, string reviewerId)
    {
        var review = await _context.Reviews.FindAsync(reviewId);
        if (review == null)
            throw new NotFoundException("Review not found");

        if (review.ReviewerId != reviewerId)
            throw new UnauthorizedException("You can only update your own reviews");

        review.Rating = request.Rating;
        review.Comment = request.Comment;
        review.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Update user's average rating
        await UpdateUserRatingAsync(review.RevieweeId);

        return await GetReviewResponseAsync(review);
    }

    public async Task<bool> DeleteReviewAsync(int reviewId, string reviewerId)
    {
        var review = await _context.Reviews.FindAsync(reviewId);
        if (review == null)
            return false;

        if (review.ReviewerId != reviewerId)
            throw new UnauthorizedException("You can only delete your own reviews");

        var revieweeId = review.RevieweeId;
        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();

        // Update user's average rating
        await UpdateUserRatingAsync(revieweeId);

        return true;
    }

    public async Task<bool> ModerateReviewAsync(int reviewId, bool isVisible)
    {
        var review = await _context.Reviews.FindAsync(reviewId);
        if (review == null)
            return false;

        var revieweeId = review.RevieweeId;
        review.IsVisible = isVisible;
        review.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Update user's average rating
        await UpdateUserRatingAsync(revieweeId);

        return true;
    }

    public async Task<bool> CanUserReviewAsync(string reviewerId, string revieweeId, int? offerId = null)
    {
        // Users cannot review themselves
        if (reviewerId == revieweeId)
            return false;

        // If offer-based review, check if users were part of the transaction
        if (offerId.HasValue)
        {
            var offer = await _context.Offers
                .Include(o => o.Need)
                .FirstOrDefaultAsync(o => o.Id == offerId.Value);

            if (offer == null)
                return false;

            // Only the buyer (need owner) or provider (offer owner) can review each other
            var isBuyer = offer.Need.UserId == reviewerId && offer.ProviderId == revieweeId;
            var isProvider = offer.ProviderId == reviewerId && offer.Need.UserId == revieweeId;

            if (!isBuyer && !isProvider)
                return false;

            // Only allow reviews for accepted offers
            if (offer.Status != OfferStatus.Accepted)
                return false;
        }

        return true;
    }

    public async Task UpdateUserRatingAsync(string userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return;

        var reviews = await _context.Reviews
            .Where(r => r.RevieweeId == userId && r.IsVisible)
            .ToListAsync();

        if (reviews.Any())
        {
            user.Rating = Math.Round(reviews.Average(r => r.Rating), 2);
            user.ReviewCount = reviews.Count;
        }
        else
        {
            user.Rating = 0;
            user.ReviewCount = 0;
        }

        await _context.SaveChangesAsync();
    }

    private async Task<ReviewResponse> GetReviewResponseAsync(Review review)
    {
        // Ensure navigation properties are loaded
        if (review.Reviewer == null)
        {
            await _context.Entry(review)
                .Reference(r => r.Reviewer)
                .LoadAsync();
        }

        if (review.Reviewee == null)
        {
            await _context.Entry(review)
                .Reference(r => r.Reviewee)
                .LoadAsync();
        }

        return new ReviewResponse
        {
            Id = review.Id,
            ReviewerId = review.ReviewerId,
            ReviewerName = $"{review.Reviewer?.FirstName} {review.Reviewer?.LastName}".Trim(),
            ReviewerProfileImage = review.Reviewer?.ProfileImageUrl,
            RevieweeId = review.RevieweeId,
            RevieweeName = $"{review.Reviewee?.FirstName} {review.Reviewee?.LastName}".Trim(),
            OfferId = review.OfferId,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt,
            UpdatedAt = review.UpdatedAt,
            IsVisible = review.IsVisible
        };
    }
}