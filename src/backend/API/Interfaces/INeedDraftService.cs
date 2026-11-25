using API.Models;

namespace API.Interfaces;

public interface INeedDraftService
{
    /// <summary>Suggests listing fields (title, category, budget, location) from one line of text.</summary>
    Task<NeedDraftResponse> BuildDraftAsync(string text);
}
