using API.Configuration;
using API.Middleware;
using System.IO.Compression;

var builder = WebApplication.CreateBuilder(args);

// Fail fast on an insecure JWT secret outside Development
if (!builder.Environment.IsDevelopment())
{
    const string placeholderSecret = "YourSuperSecretKeyThatIsAtLeast32CharactersLong!";
    var jwtSecret = builder.Configuration["JwtSettings:Secret"];
    if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32 || jwtSecret == placeholderSecret)
    {
        throw new InvalidOperationException(
            $"JwtSettings:Secret is missing, shorter than 32 characters, or still the placeholder value " +
            $"(environment: {builder.Environment.EnvironmentName}). Set a strong random secret, e.g. via the " +
            "JwtSettings__Secret environment variable.");
    }
}

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Prevent circular reference serialization errors (e.g., Category <-> SubCategories)
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // Clients compare statuses as strings ('Active', 'Pending'); keep [Flags] enums numeric.
        options.JsonSerializerOptions.Converters.Add(new API.Configuration.StringEnumExceptFlagsConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Arayanibul API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new()
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new()
    {
        {
            new()
            {
                Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });

    // Support for file uploads
    c.OperationFilter<SwaggerFileOperationFilter>();
});

// Application Services
builder.Services.AddApplicationServices(builder.Configuration, builder.Environment);
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddBusinessServices();
builder.Services.AddCorsPolicy(builder.Configuration);

var app = builder.Build();

// Behind the reverse proxy (Caddy) the API is only reachable on the internal Docker network,
// so trust X-Forwarded-For/-Proto from it. Caddy overwrites X-Forwarded-For with the real
// client IP (Cloudflare's CF-Connecting-IP), so RemoteIpAddress becomes the client's IP.
if (app.Configuration.GetValue<bool>("ReverseProxy:Enabled"))
{
    var forwardedOptions = new Microsoft.AspNetCore.Builder.ForwardedHeadersOptions
    {
        ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
                         | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto,
        ForwardLimit = 1
    };
    forwardedOptions.KnownNetworks.Clear();
    forwardedOptions.KnownProxies.Clear();
    app.UseForwardedHeaders(forwardedOptions);
}

// Seed database (skip in test environment)
if (!app.Environment.IsEnvironment("Testing"))
{
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<API.Data.ApplicationDbContext>();
        // Apply pending EF Core migrations on startup (single-instance deployment); disable with Database:MigrateOnStartup=false
        if (app.Configuration.GetValue("Database:MigrateOnStartup", true))
        {
            await Microsoft.EntityFrameworkCore.RelationalDatabaseFacadeExtensions.MigrateAsync(context.Database);
        }
        await API.Data.SeedData.SeedCategoriesAsync(context);
        await API.Data.SeedData.EnsureFocusCategoriesAsync(context);
        await API.Data.SeedData.UpdateCategoryDescriptionsAsync(context);
        await API.Services.AdminRoleService.SeedModerationKeywordsAsync(context);
        await scope.ServiceProvider.GetRequiredService<API.Services.AdminRoleService>().SyncConfiguredAdminsAsync();
    }
}

// Configure the HTTP request pipeline.
// Swagger only in Development, or when explicitly enabled with Swagger:Enabled=true
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Arayanibul API v1");
        c.RoutePrefix = "swagger";
    });
}

// Health check endpoint
app.MapHealthChecks("/health");

// Security middleware
app.UseMiddleware<SecurityHeadersMiddleware>();

// Only enable security monitoring in production
if (!app.Environment.IsDevelopment())
{
    app.UseMiddleware<SecurityMonitoringMiddleware>();
}

// Performance middleware
app.UseResponseCompression();

// Only enable rate limiting in production
if (!app.Environment.IsDevelopment())
{
    app.UseMiddleware<RateLimitingMiddleware>();
}

// Global exception handling middleware
app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseHttpsRedirection();
app.UseStaticFiles(); // Enable static file serving
app.UseCors("AllowMobile");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<API.Hubs.ChatHub>("/chathub").RequireCors("AllowSignalR");

app.Run();

// Make Program class accessible for integration tests
public partial class Program { }
