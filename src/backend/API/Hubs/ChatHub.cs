using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private static readonly Dictionary<string, string> UserConnections = new();

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            UserConnections[userId] = Context.ConnectionId;
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            UserConnections.Remove(userId);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"User_{userId}");
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinOfferConversation(string offerId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Offer_{offerId}");
    }

    public async Task LeaveOfferConversation(string offerId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Offer_{offerId}");
    }

    public static string? GetConnectionId(string userId)
    {
        UserConnections.TryGetValue(userId, out var connectionId);
        return connectionId;
    }

    public static bool IsUserOnline(string userId)
    {
        return UserConnections.ContainsKey(userId);
    }
}