using System.Security.Claims;
using API.Data;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

/// <summary>Blocking other users (api/users/...). Profile endpoints live in UserController (api/user).</summary>
[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public UsersController(ApplicationDbContext context)
    {
        _context = context;
    }

    private string? CurrentUserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    private bool IsGuest => User.FindFirst("isGuest")?.Value == "True";

    [HttpGet("blocked")]
    public async Task<ActionResult<List<BlockedUserResponse>>> GetBlockedUsers()
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı." });

        var blocked = await _context.UserBlocks.AsNoTracking()
            .Where(b => b.BlockerId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new BlockedUserResponse
            {
                UserId = b.BlockedId,
                FullName = (b.Blocked.FirstName + " " + b.Blocked.LastName).Trim(),
                BlockedAt = b.CreatedAt
            })
            .ToListAsync();

        return Ok(blocked);
    }

    [HttpPost("{id}/block")]
    public async Task<ActionResult> BlockUser(string id)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı." });
        if (IsGuest) return StatusCode(403, new { message = "Engelleme için hesap oluşturmanız gerekiyor." });
        if (id == userId) return BadRequest(new { message = "Kendinizi engelleyemezsiniz." });

        if (!await _context.Users.AnyAsync(u => u.Id == id))
        {
            return NotFound(new { message = "Kullanıcı bulunamadı." });
        }

        var exists = await _context.UserBlocks.AnyAsync(b => b.BlockerId == userId && b.BlockedId == id);
        if (!exists)
        {
            _context.UserBlocks.Add(new UserBlock { BlockerId = userId, BlockedId = id, CreatedAt = DateTime.UtcNow });
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // concurrent duplicate block — already blocked
            }
        }

        return Ok(new { message = "Kullanıcı engellendi." });
    }

    [HttpDelete("{id}/block")]
    public async Task<ActionResult> UnblockUser(string id)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized(new { message = "Kullanıcı kimliği bulunamadı." });

        var block = await _context.UserBlocks.FirstOrDefaultAsync(b => b.BlockerId == userId && b.BlockedId == id);
        if (block != null)
        {
            _context.UserBlocks.Remove(block);
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Kullanıcının engeli kaldırıldı." });
    }
}
