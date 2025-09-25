namespace API.Models;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string NameTr { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public int? ParentCategoryId { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;
    
    // Navigation Properties
    public Category? ParentCategory { get; set; }
    public List<Category> SubCategories { get; set; } = new();
    public List<Need> Needs { get; set; } = new();
}