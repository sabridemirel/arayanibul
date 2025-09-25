namespace API.Middleware;

public class ValidationException : Exception
{
    public Dictionary<string, string[]> Errors { get; }

    public ValidationException(Dictionary<string, string[]> errors) : base("Validation failed")
    {
        Errors = errors;
    }

    public ValidationException(string field, string error) : base("Validation failed")
    {
        Errors = new Dictionary<string, string[]>
        {
            { field, new[] { error } }
        };
    }
}

public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message = "Yetkisiz erişim") : base(message)
    {
    }
}

public class NotFoundException : Exception
{
    public NotFoundException(string message = "Kayıt bulunamadı") : base(message)
    {
    }
}

public class ForbiddenException : Exception
{
    public ForbiddenException(string message = "Bu işlem için yetkiniz bulunmuyor") : base(message)
    {
    }
}

public class BusinessException : Exception
{
    public BusinessException(string message) : base(message)
    {
    }
}