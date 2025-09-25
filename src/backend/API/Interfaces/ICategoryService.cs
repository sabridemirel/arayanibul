using API.Models;

namespace API.Interfaces;

public interface ICategoryService
{
    Task<List<Category>> GetCategoriesAsync();
    Task<List<Category>> GetMainCategoriesAsync();
    Task<List<Category>> GetSubCategoriesAsync(int parentCategoryId);
    Task<Category?> GetCategoryByIdAsync(int categoryId);
    Task<Category> CreateCategoryAsync(Category category);
    Task<Category?> UpdateCategoryAsync(int categoryId, Category category);
    Task<bool> DeleteCategoryAsync(int categoryId);
    Task<bool> CategoryExistsAsync(int categoryId);
}