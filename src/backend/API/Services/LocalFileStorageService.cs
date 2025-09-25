using API.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;

namespace API.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<LocalFileStorageService> _logger;
    private readonly string _uploadsPath;
    private readonly string _baseUrl;

    public LocalFileStorageService(IWebHostEnvironment environment, ILogger<LocalFileStorageService> logger, IConfiguration configuration)
    {
        _environment = environment;
        _logger = logger;
        _uploadsPath = Path.Combine(_environment.WebRootPath ?? _environment.ContentRootPath, "uploads");
        _baseUrl = configuration["BaseUrl"] ?? "http://localhost:5000";
        
        // Ensure uploads directory exists
        if (!Directory.Exists(_uploadsPath))
        {
            Directory.CreateDirectory(_uploadsPath);
        }
    }

    public async Task<string?> UploadImageAsync(IFormFile imageFile, string folder)
    {
        try
        {
            if (imageFile == null || imageFile.Length == 0)
            {
                return null;
            }

            // Validate file type
            var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
            if (!allowedTypes.Contains(imageFile.ContentType.ToLower()))
            {
                _logger.LogWarning("Invalid file type: {ContentType}", imageFile.ContentType);
                return null;
            }

            // Validate file size (5MB max)
            if (imageFile.Length > 5 * 1024 * 1024)
            {
                _logger.LogWarning("File too large: {Size} bytes", imageFile.Length);
                return null;
            }

            // Create folder if it doesn't exist
            var folderPath = Path.Combine(_uploadsPath, folder);
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
            }

            // Generate unique filename
            var fileExtension = Path.GetExtension(imageFile.FileName).ToLower();
            var fileName = $"{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(folderPath, fileName);

            // Process and save image
            using var stream = imageFile.OpenReadStream();
            using var image = await Image.LoadAsync(stream);
            
            // Resize image if too large (max 1024x1024)
            if (image.Width > 1024 || image.Height > 1024)
            {
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new Size(1024, 1024),
                    Mode = ResizeMode.Max
                }));
            }

            // Save with appropriate format and quality
            if (fileExtension == ".jpg" || fileExtension == ".jpeg")
            {
                await image.SaveAsJpegAsync(filePath, new JpegEncoder { Quality = 85 });
            }
            else if (fileExtension == ".png")
            {
                await image.SaveAsPngAsync(filePath, new PngEncoder());
            }
            else if (fileExtension == ".webp")
            {
                await image.SaveAsWebpAsync(filePath, new WebpEncoder { Quality = 85 });
            }

            // Return the URL
            return GetFileUrl(fileName, folder);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading image file");
            return null;
        }
    }

    public Task<bool> DeleteFileAsync(string fileUrl)
    {
        try
        {
            if (string.IsNullOrEmpty(fileUrl))
            {
                return Task.FromResult(false);
            }

            // Extract file path from URL
            var uri = new Uri(fileUrl);
            var relativePath = uri.AbsolutePath.TrimStart('/');
            var filePath = Path.Combine(_environment.WebRootPath ?? _environment.ContentRootPath, relativePath);

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file: {FileUrl}", fileUrl);
            return Task.FromResult(false);
        }
    }

    public Task<bool> FileExistsAsync(string fileUrl)
    {
        try
        {
            if (string.IsNullOrEmpty(fileUrl))
            {
                return Task.FromResult(false);
            }

            var uri = new Uri(fileUrl);
            var relativePath = uri.AbsolutePath.TrimStart('/');
            var filePath = Path.Combine(_environment.WebRootPath ?? _environment.ContentRootPath, relativePath);

            return Task.FromResult(File.Exists(filePath));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking file existence: {FileUrl}", fileUrl);
            return Task.FromResult(false);
        }
    }

    public string GetFileUrl(string fileName, string folder)
    {
        return $"{_baseUrl.TrimEnd('/')}/uploads/{folder}/{fileName}";
    }
}