using API.Configuration;
using API.Middleware;
using System.IO.Compression;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Prevent circular reference serialization errors (e.g., Category <-> SubCategories)
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
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
builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddBusinessServices();
builder.Services.AddCorsPolicy();

var app = builder.Build();

// Seed database (skip in test environment)
if (!app.Environment.IsEnvironment("Testing"))
{
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<API.Data.ApplicationDbContext>();
        await API.Data.SeedData.SeedCategoriesAsync(context);
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

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
