using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using API.Interfaces;
using API.Models;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewController : ControllerBase
{
    private readonly IReviewService _reviewService;

    public ReviewController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    /// <summary>
    /// Create a new review
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ReviewResponse>> CreateReview([FromBody] CreateReviewRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var review = await _reviewService.CreateReviewAsync(request, userId);
        return CreatedAtAction(nameof(GetReviewById), new { id = review.Id }, review);
    }

    /// <summary>
    /// Get review by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ReviewResponse>> GetReviewById(int id)
    {
        var review = await _reviewService.GetReviewByIdAsync(id);
        if (review == null)
            return NotFound();

        return Ok(review);
    }

    /// <summary>
    /// Get reviews with filtering
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<ReviewResponse>>> GetReviews([FromQuery] ReviewFilterRequest filter)
    {
        var reviews = await _reviewService.GetReviewsAsync(filter);
        return Ok(reviews);
    }

    /// <summary>
    /// Get reviews for a specific user
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<ReviewResponse>>> GetUserReviews(
        string userId, 
        [FromQuery] bool asReviewer = false)
    {
        var reviews = await _reviewService.GetUserReviewsAsync(userId, asReviewer);
        return Ok(reviews);
    }

    /// <summary>
    /// Get user's rating summary
    /// </summary>
    [HttpGet("user/{userId}/rating")]
    public async Task<ActionResult<UserRatingResponse>> GetUserRating(string userId)
    {
        var rating = await _reviewService.GetUserRatingAsync(userId);
        return Ok(rating);
    }

    /// <summary>
    /// Get current user's reviews (as reviewer)
    /// </summary>
    [HttpGet("my-reviews")]
    [Authorize]
    public async Task<ActionResult<List<ReviewResponse>>> GetMyReviews()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var reviews = await _reviewService.GetUserReviewsAsync(userId, asReviewer: true);
        return Ok(reviews);
    }

    /// <summary>
    /// Get reviews received by current user
    /// </summary>
    [HttpGet("received-reviews")]
    [Authorize]
    public async Task<ActionResult<List<ReviewResponse>>> GetReceivedReviews()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var reviews = await _reviewService.GetUserReviewsAsync(userId, asReviewer: false);
        return Ok(reviews);
    }

    /// <summary>
    /// Update a review
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult<ReviewResponse>> UpdateReview(int id, [FromBody] UpdateReviewRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var review = await _reviewService.UpdateReviewAsync(id, request, userId);
        return Ok(review);
    }

    /// <summary>
    /// Delete a review
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<ActionResult> DeleteReview(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var success = await _reviewService.DeleteReviewAsync(id, userId);
        if (!success)
            return NotFound();

        return NoContent();
    }

    /// <summary>
    /// Check if current user can review another user
    /// </summary>
    [HttpGet("can-review")]
    [Authorize]
    public async Task<ActionResult<bool>> CanReview(
        [FromQuery] string revieweeId, 
        [FromQuery] int? offerId = null)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var canReview = await _reviewService.CanUserReviewAsync(userId, revieweeId, offerId);
        return Ok(canReview);
    }

    /// <summary>
    /// Moderate a review (Admin only)
    /// </summary>
    [HttpPatch("{id}/moderate")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> ModerateReview(int id, [FromBody] bool isVisible)
    {
        var success = await _reviewService.ModerateReviewAsync(id, isVisible);
        if (!success)
            return NotFound();

        return NoContent();
    }

    /// <summary>
    /// Recalculate user rating (Admin only)
    /// </summary>
    [HttpPost("user/{userId}/recalculate-rating")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> RecalculateUserRating(string userId)
    {
        await _reviewService.UpdateUserRatingAsync(userId);
        return NoContent();
    }
}