using API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly ApplicationDbContext _context;

    public ChatHub(ApplicationDbContext context)
    {
        _context = context;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"User_{userId}");
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinOfferConversation(string offerId)
    {
        // Only the buyer (need owner) and the provider of the offer may listen to its messages.
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !int.TryParse(offerId, out var id))
            throw new HubException("Geçersiz istek.");

        var isParty = await _context.Offers
            .AnyAsync(o => o.Id == id && (o.ProviderId == userId || o.Need.UserId == userId));
        if (!isParty)
            throw new HubException("Bu konuşmaya erişim yetkiniz yok.");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"Offer_{offerId}");
    }

    public async Task LeaveOfferConversation(string offerId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Offer_{offerId}");
    }

}