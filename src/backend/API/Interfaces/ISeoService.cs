namespace API.Interfaces;

public interface ISeoService
{
    /// <summary>sitemap.xml listing the public pages of the web app and every active need.</summary>
    Task<string> BuildSitemapAsync();

    /// <summary>
    /// Static HTML for one need (title, description, Open Graph tags and the listing text) for
    /// search engines and link-preview crawlers, which do not run the web app's JavaScript.
    /// Returns null when the need does not exist or is not publicly listed.
    /// </summary>
    Task<string?> BuildNeedPageAsync(int needId);
}
