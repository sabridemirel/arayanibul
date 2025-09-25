using API.Models;

namespace API.Interfaces;

public interface IMessageService
{
    Task<Message> SendMessageAsync(SendMessageRequest request, string senderId);
    Task<List<Message>> GetConversationAsync(int offerId, string userId);
    Task<List<ConversationDto>> GetUserConversationsAsync(string userId);
    Task<bool> MarkAsReadAsync(int messageId, string userId);
    Task<bool> MarkConversationAsReadAsync(int offerId, string userId);
    Task<int> GetUnreadMessageCountAsync(string userId);
}