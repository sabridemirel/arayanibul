using Microsoft.AspNetCore.Mvc;
using API.Models;
using API.Services;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
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
}