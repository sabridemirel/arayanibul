using API.Interfaces;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoryController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoryController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    /// <summary>
    /// Get all active categories with their subcategories
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)] // Cache for 1 hour
    public async Task<ActionResult<List<Category>>> GetCategories()
    {
        try
        {
            var categories = await _categoryService.GetCategoriesAsync();
            return Ok(categories);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Kategoriler alınırken bir hata oluştu.", error = ex.Message });
        }
    }

    /// <summary>
    /// Get only main categories (parent categories)
    /// </summary>
    [HttpGet("main")]
    [AllowAnonymous]
    [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)] // Cache for 1 hour
    public async Task<ActionResult<List<Category>>> GetMainCategories()
    {
        try
        {
            var categories = await _categoryService.GetMainCategoriesAsync();
            return Ok(categories);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Ana kategoriler alınırken bir hata oluştu.", error = ex.Message });
        }
    }

    /// <summary>
    /// Get subcategories for a specific parent category
    /// </summary>
    [HttpGet("{parentId}/subcategories")]
    [AllowAnonymous]
    [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any, VaryByQueryKeys = new[] { "parentId" })]
    public async Task<ActionResult<List<Category>>> GetSubCategories(int parentId)
    {
        try
        {
            var parentExists = await _categoryService.CategoryExistsAsync(parentId);
            if (!parentExists)
            {
                return NotFound(new { message = "Ana kategori bulunamadı." });
            }

            var subCategories = await _categoryService.GetSubCategoriesAsync(parentId);
            return Ok(subCategories);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Alt kategoriler alınırken bir hata oluştu.", error = ex.Message });
        }
    }

    /// <summary>
    /// Get a specific category by ID
    /// </summary>
    [HttpGet("{id}")]
    [AllowAnonymous]
    [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any, VaryByQueryKeys = new[] { "id" })]
    public async Task<ActionResult<Category>> GetCategory(int id)
    {
        try
        {
            var category = await _categoryService.GetCategoryByIdAsync(id);
            if (category == null)
            {
                return NotFound(new { message = "Kategori bulunamadı." });
            }

            return Ok(category);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Kategori alınırken bir hata oluştu.", error = ex.Message });
        }
    }

    /// <summary>
    /// Create a new category (Admin only)
    /// </summary>
    [HttpPost]
    [Authorize] // In future, this should be Admin only
    public async Task<ActionResult<Category>> CreateCategory([FromBody] Category category)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(category.Name) || string.IsNullOrWhiteSpace(category.NameTr))
            {
                return BadRequest(new { message = "Kategori adı ve Türkçe adı gereklidir." });
            }

            // Validate parent category exists if specified
            if (category.ParentCategoryId.HasValue)
            {
                var parentExists = await _categoryService.CategoryExistsAsync(category.ParentCategoryId.Value);
                if (!parentExists)
                {
                    return BadRequest(new { message = "Belirtilen ana kategori bulunamadı." });
                }
            }

            var createdCategory = await _categoryService.CreateCategoryAsync(category);
            return CreatedAtAction(nameof(GetCategory), new { id = createdCategory.Id }, createdCategory);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Kategori oluşturulurken bir hata oluştu.", error = ex.Message });
        }
    }

    /// <summary>
    /// Update an existing category (Admin only)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize] // In future, this should be Admin only
    public async Task<ActionResult<Category>> UpdateCategory(int id, [FromBody] Category category)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(category.Name) || string.IsNullOrWhiteSpace(category.NameTr))
            {
                return BadRequest(new { message = "Kategori adı ve Türkçe adı gereklidir." });
            }

            // Validate parent category exists if specified
            if (category.ParentCategoryId.HasValue)
            {
                var parentExists = await _categoryService.CategoryExistsAsync(category.ParentCategoryId.Value);
                if (!parentExists)
                {
                    return BadRequest(new { message = "Belirtilen ana kategori bulunamadı." });
                }
            }

            var updatedCategory = await _categoryService.UpdateCategoryAsync(id, category);
            if (updatedCategory == null)
            {
                return NotFound(new { message = "Kategori bulunamadı." });
            }

            return Ok(updatedCategory);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Kategori güncellenirken bir hata oluştu.", error = ex.Message });
        }
    }

    /// <summary>
    /// Delete a category (Admin only) - Soft delete
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize] // In future, this should be Admin only
    public async Task<ActionResult> DeleteCategory(int id)
    {
        try
        {
            var result = await _categoryService.DeleteCategoryAsync(id);
            if (!result)
            {
                return NotFound(new { message = "Kategori bulunamadı." });
            }

            return Ok(new { message = "Kategori başarıyla silindi." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Kategori silinirken bir hata oluştu.", error = ex.Message });
        }
    }
}