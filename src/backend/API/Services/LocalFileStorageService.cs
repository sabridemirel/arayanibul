using API.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats;
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

    // Clients downscale to this size before upload; the server enforces it for older clients.
    private const int MaxImageDimension = 2048;

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

    /// <summary>
    /// Only the formats we accept are decoded. The declared content type comes from the client, so
    /// without this a TIFF/BMP/GIF/... sent as "image/jpeg" would still reach its decoder; the
    /// less common decoders (TIFF in particular) are where most ImageSharp advisories land.
    /// </summary>
    private static readonly DecoderOptions UploadDecoderOptions = new()
    {
        Configuration = new SixLabors.ImageSharp.Configuration(
            new JpegConfigurationModule(),
            new PngConfigurationModule(),
            new WebpConfigurationModule())
    };

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

            // Every image is re-encoded as WebP regardless of the uploaded extension
            var fileName = $"{Guid.NewGuid()}.webp";
            var filePath = Path.Combine(folderPath, fileName);

            using var stream = imageFile.OpenReadStream();
            using var image = await Image.LoadAsync(UploadDecoderOptions, stream);

            // Apply the camera's EXIF orientation, then drop all metadata (GPS location, device
            // model, capture time) so photos never reveal where they were taken.
            image.Mutate(x => x.AutoOrient());
            image.Metadata.ExifProfile = null;
            image.Metadata.XmpProfile = null;
            image.Metadata.IptcProfile = null;

            if (image.Width > MaxImageDimension || image.Height > MaxImageDimension)
            {
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new Size(MaxImageDimension, MaxImageDimension),
                    Mode = ResizeMode.Max
                }));
            }

            await image.SaveAsWebpAsync(filePath, new WebpEncoder { Quality = 82 });

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