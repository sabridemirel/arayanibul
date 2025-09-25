using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using API.Models;
using API.Interfaces;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.RegisterAsync(dto);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.LoginAsync(dto);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("guest-login")]
    public async Task<ActionResult<AuthResponseDto>> GuestLogin()
    {
        var result = await _authService.GuestLoginAsync();
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("google-login")]
    public async Task<ActionResult<AuthResponseDto>> GoogleLogin([FromBody] GoogleLoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.GoogleLoginAsync(dto.Token);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("facebook-login")]
    public async Task<ActionResult<AuthResponseDto>> FacebookLogin([FromBody] FacebookLoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.FacebookLoginAsync(dto.Token);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult> Logout()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var result = await _authService.LogoutAsync(userId);
        return result ? Ok(new { message = "Çıkış başarılı" }) : BadRequest(new { message = "Çıkış yapılamadı" });
    }

    [HttpPost("refresh-token")]
    public async Task<ActionResult<TokenResponseDto>> RefreshToken([FromBody] RefreshTokenDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.RefreshTokenAsync(dto.RefreshToken);
        return result != null ? Ok(result) : BadRequest(new { message = "Geçersiz refresh token" });
    }

    [HttpPost("validate-token")]
    public async Task<ActionResult> ValidateToken([FromBody] ValidateTokenDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var isValid = await _authService.ValidateTokenAsync(dto.Token);
        return Ok(new { isValid });
    }
}