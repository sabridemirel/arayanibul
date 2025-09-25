using API.Data;
using API.Interfaces;
using API.Models;
using API.Hubs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;

namespace API.Services;

public class MessageService : IMessageService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IHubContext<ChatHub> _hubContext;

    public MessageService(ApplicationDbContext context, INotificationService notificationService, IHubContext<ChatHub> hubContext)
    {
        _context = context;
        _notificationService = notificationService;
        _hubContext = hubContext;
    }

    public async Task<Message> SendMessageAsync(SendMessageRequest request, string senderId)
    {
        // Verify that the offer exists and the sender is either the buyer or provider
        var offer = await _context.Offers
            .Include(o => o.Need)
            .FirstOrDefaultAsync(o => o.Id == request.OfferId);

        if (offer == null)
        {
            throw new ArgumentException("Teklif bulunamadı.");
        }

        // Check if sender is authorized (either the buyer or the provider)
        if (offer.ProviderId != senderId && offer.Need.UserId != senderId)
        {
            throw new UnauthorizedAccessException("Bu konuşmaya mesaj gönderme yetkiniz yok.");
        }

        var message = new Message
        {
            OfferId = request.OfferId,
            SenderId = senderId,
            Content = request.Content,
            Type = request.Type,
            AttachmentUrl = request.AttachmentUrl,
            CreatedAt = DateTime.UtcNow
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Load the message with sender information
        var savedMessage = await _context.Messages
            .Include(m => m.Sender)
            .FirstOrDefaultAsync(m => m.Id == message.Id);

        if (savedMessage != null)
        {
            // Determine recipient (the other party in the conversation)
            var recipientId = offer.ProviderId == senderId ? offer.Need.UserId : offer.ProviderId;
            
            // Create message DTO for real-time notification
            var messageDto = new MessageDto
            {
                Id = savedMessage.Id,
                OfferId = savedMessage.OfferId,
                SenderId = savedMessage.SenderId,
                SenderName = $"{savedMessage.Sender.FirstName} {savedMessage.Sender.LastName}".Trim(),
                SenderProfileImage = savedMessage.Sender.ProfileImageUrl ?? "",
                Content = savedMessage.Content,
                Type = savedMessage.Type,
                AttachmentUrl = savedMessage.AttachmentUrl,
                IsRead = savedMessage.IsRead,
                CreatedAt = savedMessage.CreatedAt,
                IsSentByCurrentUser = false // For the recipient, this is false
            };

            // Send real-time message to the offer conversation group
            await _hubContext.Clients.Group($"Offer_{request.OfferId}").SendAsync("ReceiveMessage", messageDto);
            
            // Send real-time message to the specific recipient
            await _hubContext.Clients.Group($"User_{recipientId}").SendAsync("NewMessage", messageDto);
            
            // Send push notification to recipient
            await _notificationService.NotifyNewMessageAsync(recipientId, savedMessage.Id);
        }

        return savedMessage ?? message;
    }

    public async Task<List<Message>> GetConversationAsync(int offerId, string userId)
    {
        // Verify that the user is authorized to view this conversation
        var offer = await _context.Offers
            .Include(o => o.Need)
            .FirstOrDefaultAsync(o => o.Id == offerId);

        if (offer == null)
        {
            throw new ArgumentException("Teklif bulunamadı.");
        }

        if (offer.ProviderId != userId && offer.Need.UserId != userId)
        {
            throw new UnauthorizedAccessException("Bu konuşmayı görüntüleme yetkiniz yok.");
        }

        var messages = await _context.Messages
            .Include(m => m.Sender)
            .Where(m => m.OfferId == offerId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

        return messages;
    }

    public async Task<List<ConversationDto>> GetUserConversationsAsync(string userId)
    {
        // Get all offers where user is either buyer or provider and there are messages
        var conversations = await _context.Offers
            .Include(o => o.Need)
                .ThenInclude(n => n.User)
            .Include(o => o.Provider)
            .Include(o => o.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
                .ThenInclude(m => m.Sender)
            .Where(o => (o.ProviderId == userId || o.Need.UserId == userId) && o.Messages.Any())
            .ToListAsync();

        var conversationDtos = new List<ConversationDto>();

        foreach (var offer in conversations)
        {
            // Determine the other user in the conversation
            var isProvider = offer.ProviderId == userId;
            var otherUser = isProvider ? offer.Need.User : offer.Provider;
            
            var lastMessage = offer.Messages.FirstOrDefault();
            var unreadCount = await _context.Messages
                .CountAsync(m => m.OfferId == offer.Id && m.SenderId != userId && !m.IsRead);

            var conversationDto = new ConversationDto
            {
                OfferId = offer.Id,
                NeedId = offer.NeedId,
                NeedTitle = offer.Need.Title,
                OtherUserId = otherUser.Id,
                OtherUserName = $"{otherUser.FirstName} {otherUser.LastName}".Trim(),
                OtherUserProfileImage = otherUser.ProfileImageUrl ?? "",
                UnreadCount = unreadCount,
                LastActivity = lastMessage?.CreatedAt ?? offer.CreatedAt,
                OfferPrice = offer.Price,
                OfferStatus = offer.Status
            };

            if (lastMessage != null)
            {
                conversationDto.LastMessage = new MessageDto
                {
                    Id = lastMessage.Id,
                    OfferId = lastMessage.OfferId,
                    SenderId = lastMessage.SenderId,
                    SenderName = $"{lastMessage.Sender.FirstName} {lastMessage.Sender.LastName}".Trim(),
                    SenderProfileImage = lastMessage.Sender.ProfileImageUrl ?? "",
                    Content = lastMessage.Content,
                    Type = lastMessage.Type,
                    AttachmentUrl = lastMessage.AttachmentUrl,
                    IsRead = lastMessage.IsRead,
                    CreatedAt = lastMessage.CreatedAt,
                    IsSentByCurrentUser = lastMessage.SenderId == userId
                };
            }

            conversationDtos.Add(conversationDto);
        }

        // Sort by last activity (most recent first)
        return conversationDtos.OrderByDescending(c => c.LastActivity).ToList();
    }

    public async Task<bool> MarkAsReadAsync(int messageId, string userId)
    {
        var message = await _context.Messages
            .Include(m => m.Offer)
                .ThenInclude(o => o.Need)
            .FirstOrDefaultAsync(m => m.Id == messageId);

        if (message == null)
        {
            return false;
        }

        // Only allow marking as read if the user is the recipient (not the sender)
        var isRecipient = (message.Offer.ProviderId == userId && message.SenderId != userId) ||
                         (message.Offer.Need.UserId == userId && message.SenderId != userId);

        if (!isRecipient)
        {
            return false;
        }

        message.IsRead = true;
        await _context.SaveChangesAsync();

        // Notify the sender via SignalR that their message was read
        await _hubContext.Clients.Group($"User_{message.SenderId}").SendAsync("MessageRead", new { messageId = messageId, readBy = userId });

        return true;
    }

    public async Task<bool> MarkConversationAsReadAsync(int offerId, string userId)
    {
        // Verify user has access to this conversation
        var offer = await _context.Offers
            .Include(o => o.Need)
            .FirstOrDefaultAsync(o => o.Id == offerId);

        if (offer == null)
        {
            return false;
        }

        if (offer.ProviderId != userId && offer.Need.UserId != userId)
        {
            return false;
        }

        // Mark all unread messages in this conversation as read (except those sent by the user)
        var unreadMessages = await _context.Messages
            .Where(m => m.OfferId == offerId && m.SenderId != userId && !m.IsRead)
            .ToListAsync();

        var messageIds = new List<int>();
        foreach (var message in unreadMessages)
        {
            message.IsRead = true;
            messageIds.Add(message.Id);
        }

        if (unreadMessages.Any())
        {
            await _context.SaveChangesAsync();

            // Notify all senders via SignalR that their messages were read
            var senderIds = unreadMessages.Select(m => m.SenderId).Distinct();
            foreach (var senderId in senderIds)
            {
                await _hubContext.Clients.Group($"User_{senderId}").SendAsync("ConversationRead", new { offerId = offerId, readBy = userId, messageIds = messageIds.Where(id => unreadMessages.Any(m => m.Id == id && m.SenderId == senderId)).ToList() });
            }
        }

        return true;
    }

    public async Task<int> GetUnreadMessageCountAsync(string userId)
    {
        // Count all unread messages where the user is the recipient
        var count = await _context.Messages
            .Include(m => m.Offer)
                .ThenInclude(o => o.Need)
            .Where(m => !m.IsRead && m.SenderId != userId &&
                       (m.Offer.ProviderId == userId || m.Offer.Need.UserId == userId))
            .CountAsync();

        return count;
    }
}