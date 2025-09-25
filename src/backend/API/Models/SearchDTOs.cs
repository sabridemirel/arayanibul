using System.ComponentModel.DataAnnotations;

namespace API.Models;

public class AdvancedSearchRequest
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string SearchText { get; set; } = string.Empty;
    
    public List<int>? CategoryIds { get; set; }
    public decimal? MinBudget { get; set; }
    public decimal? MaxBudget { get; set; }
    public string? Currency { get; set; } = "TRY";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? RadiusKm { get; set; }
    public UrgencyLevel? Urgency { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public SearchSortBy SortBy { get; set; } = SearchSortBy.Relevance;
    public bool SortDescending { get; set; } = true;
    public bool IncludeExpired { get; set; } = false;
}

public class SearchResponse
{
    public List<NeedResponse> Results { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
    public string SearchText { get; set; } = string.Empty;
    public Dictionary<string, object> AppliedFilters { get; set; } = new();
    public List<SearchSuggestion> Suggestions { get; set; } = new();
    public SearchStats Stats { get; set; } = new();
}

public class SearchSuggestion
{
    public string Text { get; set; } = string.Empty;
    public int Count { get; set; }
    public string Type { get; set; } = string.Empty; // "category", "location", "keyword"
}

public class SearchStats
{
    public int TotalResults { get; set; }
    public double SearchTimeMs { get; set; }
    public Dictionary<string, int> CategoryBreakdown { get; set; } = new();
    public Dictionary<string, int> UrgencyBreakdown { get; set; } = new();
    public Dictionary<string, int> LocationBreakdown { get; set; } = new();
}

public class SearchHistoryResponse
{
    public int Id { get; set; }
    public string SearchText { get; set; } = string.Empty;
    public Dictionary<string, object> Filters { get; set; } = new();
    public int ResultCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PopularSearchResponse
{
    public string SearchText { get; set; } = string.Empty;
    public int SearchCount { get; set; }
    public DateTime LastSearched { get; set; }
}

public enum SearchSortBy
{
    Relevance = 0,
    CreatedAt = 1,
    UpdatedAt = 2,
    Budget = 3,
    Distance = 4,
    Urgency = 5,
    OfferCount = 6
}