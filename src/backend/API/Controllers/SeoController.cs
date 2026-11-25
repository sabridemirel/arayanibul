using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

/// <summary>
/// Pages for search engines and link-preview crawlers. The reverse proxy maps these onto the web
/// domain: /sitemap.xml for everyone, /needs/{id} for crawlers only (see deploy/Caddyfile).
/// </summary>
[ApiController]
[AllowAnonymous]
[ApiExplorerSettings(IgnoreApi = true)]
public class SeoController : ControllerBase
{
    private readonly ISeoService _seoService;

    public SeoController(ISeoService seoService)
    {
        _seoService = seoService;
    }

    [HttpGet("/sitemap.xml")]
    [ResponseCache(Duration = 600, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> Sitemap()
    {
        return Content(await _seoService.BuildSitemapAsync(), "application/xml; charset=utf-8");
    }

    [HttpGet("/seo/needs/{id:int}")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> NeedPage(int id)
    {
        var html = await _seoService.BuildNeedPageAsync(id);
        if (html == null)
        {
            // A real 404 lets search engines drop listings that were closed or removed.
            return new ContentResult
            {
                StatusCode = StatusCodes.Status404NotFound,
                ContentType = "text/html; charset=utf-8",
                Content = "<!doctype html><html lang=\"tr\"><head><meta charset=\"UTF-8\" />" +
                          "<meta name=\"robots\" content=\"noindex\" /><title>İlan bulunamadı | Arayanibul</title></head>" +
                          "<body><h1>İlan bulunamadı</h1><p>Bu ilan yayından kaldırılmış olabilir.</p></body></html>"
            };
        }

        return Content(html, "text/html; charset=utf-8");
    }
}
