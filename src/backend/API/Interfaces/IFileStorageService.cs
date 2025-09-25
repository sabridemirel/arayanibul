namespace API.Interfaces;

public interface IFileStorageService
{
    Task<string?> UploadImageAsync(IFormFile imageFile, string folder);
    Task<bool> DeleteFileAsync(string fileUrl);
    Task<bool> FileExistsAsync(string fileUrl);
    string GetFileUrl(string fileName, string folder);
}