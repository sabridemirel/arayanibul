using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("")]
public class HomeController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            message = "Arayanibul API çalışıyor! 🚀",
            version = "1.0.0",
            endpoints = new
            {
                swagger = "/swagger",
                auth = "/api/auth"
            },
            status = "healthy"
        });
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }
}