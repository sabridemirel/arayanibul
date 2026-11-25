using API.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace API.Tests.Services;

public class LocalFileStorageServiceTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "storage-test-" + Guid.NewGuid());

    private sealed class FakeEnv : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = "";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ApplicationName { get; set; } = "test";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = "";
        public string EnvironmentName { get; set; } = "Test";
    }

    private LocalFileStorageService CreateService()
    {
        var env = new FakeEnv { WebRootPath = _root, ContentRootPath = _root };
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["BaseUrl"] = "https://api.test" })
            .Build();
        return new LocalFileStorageService(env, NullLogger<LocalFileStorageService>.Instance, config);
    }

    private static IFormFile JpegWithGpsAndRotation(int width, int height, string fileName)
    {
        using var image = new Image<Rgb24>(width, height);
        var exif = new ExifProfile();
        exif.SetValue(ExifTag.Orientation, (ushort)6); // stored landscape, displayed portrait
        exif.SetValue(ExifTag.GPSLatitudeRef, "N");
        exif.SetValue(ExifTag.GPSLatitude, new[] { new Rational(40), new Rational(52), new Rational(0) });
        exif.SetValue(ExifTag.Model, "iPhone 17 Pro");
        image.Metadata.ExifProfile = exif;

        var ms = new MemoryStream();
        image.SaveAsJpeg(ms);
        ms.Position = 0;
        return new FormFile(ms, 0, ms.Length, "image", fileName) { Headers = new HeaderDictionary(), ContentType = "image/jpeg" };
    }

    [Fact]
    public async Task UploadImageAsync_OrientsDownscalesAndStripsMetadata()
    {
        var url = await CreateService().UploadImageAsync(JpegWithGpsAndRotation(4000, 3000, "photo.jpg"), "needs");

        url.Should().NotBeNull().And.EndWith(".webp");
        var saved = Path.Combine(_root, "uploads", "needs", Path.GetFileName(new Uri(url!).AbsolutePath));
        using var result = await Image.LoadAsync(saved);

        result.Metadata.DecodedImageFormat!.Name.Should().Be("Webp");
        (result.Width, result.Height).Should().Be((1536, 2048)); // rotated to portrait, longest side 2048
        result.Metadata.ExifProfile.Should().BeNull();
    }

    [Fact]
    public async Task UploadImageAsync_SavesFileEvenWithoutExtension()
    {
        // Browsers send canvas blobs as "blob"; previously nothing was written but a URL was returned.
        var url = await CreateService().UploadImageAsync(JpegWithGpsAndRotation(800, 600, "blob"), "needs");

        var saved = Path.Combine(_root, "uploads", "needs", Path.GetFileName(new Uri(url!).AbsolutePath));
        File.Exists(saved).Should().BeTrue();
    }

    [Theory]
    [InlineData("tiff")]
    [InlineData("bmp")]
    [InlineData("gif")]
    public async Task UploadImageAsync_RejectsOtherFormatsSentAsJpeg(string format)
    {
        // The content type is whatever the client claims; only JPEG/PNG/WebP may reach a decoder.
        using var image = new Image<Rgb24>(64, 64);
        var ms = new MemoryStream();
        switch (format)
        {
            case "tiff": image.SaveAsTiff(ms); break;
            case "bmp": image.SaveAsBmp(ms); break;
            default: image.SaveAsGif(ms); break;
        }
        ms.Position = 0;
        var file = new FormFile(ms, 0, ms.Length, "image", "photo.jpg")
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/jpeg"
        };

        var url = await CreateService().UploadImageAsync(file, "needs");

        url.Should().BeNull();
        var folder = Path.Combine(_root, "uploads", "needs");
        (Directory.Exists(folder) ? Directory.GetFiles(folder) : Array.Empty<string>()).Should().BeEmpty();
    }

    [Fact]
    public async Task UploadImageAsync_AcceptsPngAndWebp()
    {
        foreach (var contentType in new[] { "image/png", "image/webp" })
        {
            using var image = new Image<Rgb24>(64, 64);
            var ms = new MemoryStream();
            if (contentType == "image/png") image.SaveAsPng(ms); else image.SaveAsWebp(ms);
            ms.Position = 0;
            var file = new FormFile(ms, 0, ms.Length, "image", "photo")
            {
                Headers = new HeaderDictionary(),
                ContentType = contentType
            };

            (await CreateService().UploadImageAsync(file, "needs")).Should().NotBeNull();
        }
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }
}
