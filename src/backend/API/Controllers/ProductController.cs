using System.Security.Claims;
using API.Filters;
using API.Interfaces;
using API.Middleware;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>"Gerçek Fiyat": price pages for catalogued products.</summary>
[ApiController]
[Route("api/product")]
public class ProductController : ControllerBase
{
    private readonly IProductPricingService _pricing;

    public ProductController(IProductPricingService pricing)
    {
        _pricing = pricing;
    }

    private string? UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    /// <summary>Products matching what was typed into the search box (all products when empty).</summary>
    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<ActionResult<List<ProductSummary>>> Search([FromQuery] string? q)
        => Ok(await _pricing.SearchAsync(q));

    /// <summary>The public price page. Signed-in users also get their own rank and sell target.</summary>
    [HttpGet("{slug}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductPageResponse>> GetPage(string slug)
    {
        // A signed-in visitor whose access token has expired must not silently be shown the
        // anonymous page (no rank, no sell target): answering 401 lets the client refresh and retry.
        if (UserId == null && Request.Headers.ContainsKey("Authorization"))
        {
            return Unauthorized();
        }

        var page = await _pricing.GetPageAsync(slug, UserId);
        return page == null ? NotFound(new { message = "Ürün bulunamadı." }) : Ok(page);
    }

    /// <summary>"Ben de arıyorum": name a price (or none) for the product.</summary>
    [HttpPost("{slug}/bid")]
    [Authorize]
    [RegisteredUserOnly]
    public Task<IActionResult> PlaceBid(string slug, [FromBody] ProductBidRequest request)
        => Run(async userId => Ok(await _pricing.PlaceBidAsync(slug, userId, request)));

    /// <summary>"Bu fiyata satarım": offer the best available buyer their own price.</summary>
    [HttpPost("{slug}/sell")]
    [Authorize]
    [RegisteredUserOnly]
    public Task<IActionResult> Sell(string slug)
        => Run(async userId => Ok(await _pricing.SellAtRealPriceAsync(slug, userId)));

    /// <summary>Errors come back as 400 { message } so every client can show them as they are.</summary>
    private async Task<IActionResult> Run(Func<string, Task<IActionResult>> action)
    {
        var userId = UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        try
        {
            return await action(userId);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ForbiddenException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (BusinessException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ValidationException ex)
        {
            var first = ex.Errors.Values.SelectMany(messages => messages).FirstOrDefault();
            return BadRequest(new { message = first ?? "İşlem tamamlanamadı." });
        }
    }
}
