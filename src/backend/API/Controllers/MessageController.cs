using API.Interfaces;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessageController : ControllerBase
{
    private readonly IMessageService _messageService;

    public MessageController(IMessageService messageService)
    {
        _messageService = messageService;
    }

    /// <summary>
    /// Send a message in a conversation
    /// </summary>
    [HttpPost("send")]
    public async Task<ActionResult<MessageDto>> SendMessage([FromBody] SendMessageRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var message = await _messageService.SendMessageAsync(request, userId);
            
            var messageDto = new MessageDto
            {
                Id = message.Id,
                OfferId = message.OfferId,
                SenderId = message.SenderId,
                SenderName = $"{message.Sender.FirstName} {message.Sender.LastName}".Trim(),
                SenderProfileImage = message.Sender.ProfileImageUrl ?? "",
                Content = message.Content,
                Type = message.Type,
                AttachmentUrl = message.AttachmentUrl,
                IsRead = message.IsRead,
                CreatedAt = message.CreatedAt,
                IsSentByCurrentUser = true
            };

            return Ok(messageDto);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Mesaj gönderilirken hata oluştu: {ex.Message}");
        }
    }

    /// <summary>
    /// Get conversation messages for a specific offer
    /// </summary>
    [HttpGet("conversation/{offerId}")]
    public async Task<ActionResult<List<MessageDto>>> GetConversation(int offerId)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var messages = await _messageService.GetConversationAsync(offerId, userId);
            
            var messageDtos = messages.Select(m => new MessageDto
            {
                Id = m.Id,
                OfferId = m.OfferId,
                SenderId = m.SenderId,
                SenderName = $"{m.Sender.FirstName} {m.Sender.LastName}".Trim(),
                SenderProfileImage = m.Sender.ProfileImageUrl ?? "",
                Content = m.Content,
                Type = m.Type,
                AttachmentUrl = m.AttachmentUrl,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt,
                IsSentByCurrentUser = m.SenderId == userId
            }).ToList();

            return Ok(messageDtos);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Konuşma getirilirken hata oluştu: {ex.Message}");
        }
    }

    /// <summary>
    /// Get all conversations for the current user
    /// </summary>
    [HttpGet("conversations")]
    public async Task<ActionResult<List<ConversationDto>>> GetUserConversations()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var conversations = await _messageService.GetUserConversationsAsync(userId);
            return Ok(conversations);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Konuşmalar getirilirken hata oluştu: {ex.Message}");
        }
    }

    /// <summary>
    /// Mark a specific message as read
    /// </summary>
    [HttpPost("mark-read")]
    public async Task<ActionResult> MarkAsRead([FromBody] MarkAsReadRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var success = await _messageService.MarkAsReadAsync(request.MessageId, userId);
            if (!success)
            {
                return BadRequest("Mesaj okundu olarak işaretlenemedi.");
            }

            return Ok(new { message = "Mesaj okundu olarak işaretlendi." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Mesaj işaretlenirken hata oluştu: {ex.Message}");
        }
    }

    /// <summary>
    /// Mark all messages in a conversation as read
    /// </summary>
    [HttpPost("mark-conversation-read")]
    public async Task<ActionResult> MarkConversationAsRead([FromBody] MarkConversationAsReadRequest request)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var success = await _messageService.MarkConversationAsReadAsync(request.OfferId, userId);
            if (!success)
            {
                return BadRequest("Konuşma okundu olarak işaretlenemedi.");
            }

            return Ok(new { message = "Konuşma okundu olarak işaretlendi." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Konuşma işaretlenirken hata oluştu: {ex.Message}");
        }
    }

    /// <summary>
    /// Get unread message count for the current user
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> GetUnreadMessageCount()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Kullanıcı kimliği bulunamadı.");
            }

            var count = await _messageService.GetUnreadMessageCountAsync(userId);
            return Ok(count);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Okunmamış mesaj sayısı getirilirken hata oluştu: {ex.Message}");
        }
    }
}