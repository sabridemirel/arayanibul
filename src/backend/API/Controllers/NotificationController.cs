using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using API.Interfaces;
using API.Models;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationController> _logger;

    public NotificationController(
        INotificationService notificationService,
        ILogger<NotificationController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// Get user's notifications with pagination
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<NotificationResponse>>> GetNotifications(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var notifications = await _notificationService.GetUserNotificationsAsync(userId, page, pageSize);
            return Ok(notifications);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notifications");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get notification statistics for the user
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<NotificationStatsResponse>> GetNotificationStats()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            var stats = await _notificationService.GetNotificationStatsAsync(userId);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification stats");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get unread notification count
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> GetUnreadCount()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            var count = await _notificationService.GetUnreadNotificationCountAsync(userId);
            return Ok(count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unread notification count");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Mark a specific notification as read
    /// </summary>
    [HttpPut("{notificationId}/read")]
    public async Task<ActionResult> MarkAsRead(int notificationId)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            var success = await _notificationService.MarkNotificationAsReadAsync(notificationId, userId);
            if (!success)
            {
                return NotFound("Notification not found");
            }

            return Ok(new { message = "Notification marked as read" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notification as read");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Mark all notifications as read
    /// </summary>
    [HttpPut("read-all")]
    public async Task<ActionResult> MarkAllAsRead()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            var success = await _notificationService.MarkAllNotificationsAsReadAsync(userId);
            if (!success)
            {
                return BadRequest("Failed to mark notifications as read");
            }

            return Ok(new { message = "All notifications marked as read" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking all notifications as read");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Delete a specific notification
    /// </summary>
    [HttpDelete("{notificationId}")]
    public async Task<ActionResult> DeleteNotification(int notificationId)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            var success = await _notificationService.DeleteNotificationAsync(notificationId, userId);
            if (!success)
            {
                return NotFound("Notification not found");
            }

            return Ok(new { message = "Notification deleted" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting notification");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Update device token for push notifications
    /// </summary>
    [HttpPost("device-token")]
    public async Task<ActionResult> UpdateDeviceToken([FromBody] DeviceTokenRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var success = await _notificationService.UpdateDeviceTokenAsync(userId, request.Token, request.Platform);
            if (!success)
            {
                return BadRequest("Failed to update device token");
            }

            return Ok(new { message = "Device token updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating device token");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get user's notification preferences
    /// </summary>
    [HttpGet("preferences")]
    public async Task<ActionResult<NotificationPreferencesResponse>> GetNotificationPreferences()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            var preferences = await _notificationService.GetNotificationPreferencesAsync(userId);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification preferences");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Update user's notification preferences
    /// </summary>
    [HttpPut("preferences")]
    public async Task<ActionResult> UpdateNotificationPreferences([FromBody] NotificationPreferencesRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var success = await _notificationService.UpdateNotificationPreferencesAsync(userId, request);
            if (!success)
            {
                return BadRequest("Failed to update notification preferences");
            }

            return Ok(new { message = "Notification preferences updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notification preferences");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Send a test push notification (for development/testing purposes)
    /// </summary>
    [HttpPost("test")]
    public async Task<ActionResult> SendTestNotification([FromBody] PushNotificationRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("User not found");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await _notificationService.SendPushNotificationAsync(userId, request.Title, request.Body, request.Data);
            return Ok(new { message = "Test notification sent" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending test notification");
            return StatusCode(500, "Internal server error");
        }
    }
}