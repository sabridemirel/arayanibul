namespace API.Models;

public class RecommendationRequest
{
    public string? UserId { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? RadiusKm { get; set; } = 25;
    public int MaxResults { get; set; } = 20;
    public List<int>? ExcludeCategoryIds { get; set; }
    public List<int>? ExcludeNeedIds { get; set; }
    public RecommendationType Type { get; set; } = RecommendationType.Mixed;
}

public class RecommendationResponse
{
    public List<NeedResponse> Recommendations { get; set; } = new();
    public string RecommendationType { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public double Score { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class PopularNeedsResponse
{
    public List<NeedResponse> PopularNeeds { get; set; } = new();
    public string Period { get; set; } = string.Empty;
    public Dictionary<string, int> CategoryBreakdown { get; set; } = new();
    public Dictionary<string, int> LocationBreakdown { get; set; } = new();
}

public class LocationBasedRecommendationResponse
{
    public List<NeedResponse> NearbyNeeds { get; set; } = new();
    public double CenterLatitude { get; set; }
    public double CenterLongitude { get; set; }
    public double RadiusKm { get; set; }
    public Dictionary<string, int> DistanceBreakdown { get; set; } = new();
}

public class UserInterestProfile
{
    public string UserId { get; set; } = string.Empty;
    public Dictionary<int, double> CategoryInterests { get; set; } = new(); // CategoryId -> Interest Score
    public Dictionary<string, double> KeywordInterests { get; set; } = new(); // Keyword -> Interest Score
    public Dictionary<string, double> LocationInterests { get; set; } = new(); // Location -> Interest Score
    public Dictionary<UrgencyLevel, double> UrgencyPreferences { get; set; } = new();
    public Dictionary<string, double> BudgetRangePreferences { get; set; } = new(); // Budget range -> Preference Score
    public DateTime LastUpdated { get; set; }
    public int TotalActions { get; set; }
}

public enum RecommendationType
{
    PersonalizedBehavior = 1,
    Popular = 2,
    LocationBased = 3,
    CategoryBased = 4,
    Mixed = 5,
    Trending = 6,
    SimilarUsers = 7
}