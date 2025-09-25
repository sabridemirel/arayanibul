using API.Data;
using API.Interfaces;
using API.Models;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

public class CategoryService : ICategoryService
{
    private readonly ApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly ILogger<CategoryService> _logger;
    private const string CATEGORIES_CACHE_KEY = "categories_all";
    private const string MAIN_CATEGORIES_CACHE_KEY = "categories_main";
    private const string CATEGORY_CACHE_PREFIX = "category_";
    private const string SUBCATEGORIES_CACHE_PREFIX = "subcategories_";

    public CategoryService(ApplicationDbContext context, ICacheService cacheService, ILogger<CategoryService> logger)
    {
        _context = context;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<List<Category>> GetCategoriesAsync()
    {
        var cachedCategories = await _cacheService.GetAsync<List<Category>>(CATEGORIES_CACHE_KEY);
        if (cachedCategories != null)
        {
            _logger.LogDebug("Retrieved categories from cache");
            return cachedCategories;
        }

        var categories = await _context.Categories
            .Where(c => c.IsActive)
            .Include(c => c.SubCategories.Where(sc => sc.IsActive))
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .AsNoTracking()
            .ToListAsync();

        await _cacheService.SetAsync(CATEGORIES_CACHE_KEY, categories, TimeSpan.FromHours(2));
        _logger.LogDebug("Cached {Count} categories", categories.Count);
        
        return categories;
    }

    public async Task<List<Category>> GetMainCategoriesAsync()
    {
        var cachedMainCategories = await _cacheService.GetAsync<List<Category>>(MAIN_CATEGORIES_CACHE_KEY);
        if (cachedMainCategories != null)
        {
            _logger.LogDebug("Retrieved main categories from cache");
            return cachedMainCategories;
        }

        var mainCategories = await _context.Categories
            .Where(c => c.IsActive && c.ParentCategoryId == null)
            .Include(c => c.SubCategories.Where(sc => sc.IsActive))
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .AsNoTracking()
            .ToListAsync();

        await _cacheService.SetAsync(MAIN_CATEGORIES_CACHE_KEY, mainCategories, TimeSpan.FromHours(2));
        _logger.LogDebug("Cached {Count} main categories", mainCategories.Count);
        
        return mainCategories;
    }

    public async Task<List<Category>> GetSubCategoriesAsync(int parentCategoryId)
    {
        var cacheKey = $"{SUBCATEGORIES_CACHE_PREFIX}{parentCategoryId}";
        var cachedSubCategories = await _cacheService.GetAsync<List<Category>>(cacheKey);
        if (cachedSubCategories != null)
        {
            _logger.LogDebug("Retrieved subcategories from cache for parent {ParentId}", parentCategoryId);
            return cachedSubCategories;
        }

        var subCategories = await _context.Categories
            .Where(c => c.IsActive && c.ParentCategoryId == parentCategoryId)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .AsNoTracking()
            .ToListAsync();

        await _cacheService.SetAsync(cacheKey, subCategories, TimeSpan.FromHours(2));
        _logger.LogDebug("Cached {Count} subcategories for parent {ParentId}", subCategories.Count, parentCategoryId);
        
        return subCategories;
    }

    public async Task<Category?> GetCategoryByIdAsync(int categoryId)
    {
        var cacheKey = $"{CATEGORY_CACHE_PREFIX}{categoryId}";
        var cachedCategory = await _cacheService.GetAsync<Category>(cacheKey);
        if (cachedCategory != null)
        {
            _logger.LogDebug("Retrieved category {CategoryId} from cache", categoryId);
            return cachedCategory;
        }

        var category = await _context.Categories
            .Include(c => c.ParentCategory)
            .Include(c => c.SubCategories.Where(sc => sc.IsActive))
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == categoryId && c.IsActive);

        if (category != null)
        {
            await _cacheService.SetAsync(cacheKey, category, TimeSpan.FromHours(2));
            _logger.LogDebug("Cached category {CategoryId}", categoryId);
        }
        
        return category;
    }

    public async Task<Category> CreateCategoryAsync(Category category)
    {
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        
        // Invalidate category caches
        await InvalidateCategoryCaches();
        
        return category;
    }

    public async Task<Category?> UpdateCategoryAsync(int categoryId, Category category)
    {
        var existingCategory = await _context.Categories.FindAsync(categoryId);
        if (existingCategory == null || !existingCategory.IsActive)
            return null;

        existingCategory.Name = category.Name;
        existingCategory.NameTr = category.NameTr;
        existingCategory.Description = category.Description;
        existingCategory.IconUrl = category.IconUrl;
        existingCategory.ParentCategoryId = category.ParentCategoryId;
        existingCategory.SortOrder = category.SortOrder;

        await _context.SaveChangesAsync();
        
        // Invalidate category caches
        await InvalidateCategoryCaches();
        await _cacheService.RemoveAsync($"{CATEGORY_CACHE_PREFIX}{categoryId}");
        
        return existingCategory;
    }

    public async Task<bool> DeleteCategoryAsync(int categoryId)
    {
        var category = await _context.Categories.FindAsync(categoryId);
        if (category == null)
            return false;

        // Soft delete - just mark as inactive
        category.IsActive = false;
        
        // Also deactivate subcategories
        var subCategories = await _context.Categories
            .Where(c => c.ParentCategoryId == categoryId)
            .ToListAsync();
        
        foreach (var subCategory in subCategories)
        {
            subCategory.IsActive = false;
        }

        await _context.SaveChangesAsync();
        
        // Invalidate category caches
        await InvalidateCategoryCaches();
        await _cacheService.RemoveAsync($"{CATEGORY_CACHE_PREFIX}{categoryId}");
        
        return true;
    }

    public async Task<bool> CategoryExistsAsync(int categoryId)
    {
        // Try cache first
        var cachedCategory = await _cacheService.GetAsync<Category>($"{CATEGORY_CACHE_PREFIX}{categoryId}");
        if (cachedCategory != null)
        {
            return true;
        }

        return await _context.Categories
            .AsNoTracking()
            .AnyAsync(c => c.Id == categoryId && c.IsActive);
    }

    private async Task InvalidateCategoryCaches()
    {
        await _cacheService.RemoveAsync(CATEGORIES_CACHE_KEY);
        await _cacheService.RemoveAsync(MAIN_CATEGORIES_CACHE_KEY);
        await _cacheService.RemovePatternAsync($"^{SUBCATEGORIES_CACHE_PREFIX}");
        _logger.LogDebug("Invalidated category caches");
    }
}