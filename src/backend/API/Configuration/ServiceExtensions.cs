using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.ResponseCompression;
using System.Text;
using System.IO.Compression;
using API.Data;
using API.Models;
using API.Services;
using API.Interfaces;

namespace API.Configuration;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Database
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlite(configuration.GetConnectionString("DefaultConnection")));

        // Identity
        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            // Password settings
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequireUppercase = false;
            options.Password.RequiredLength = 6;
            options.Password.RequiredUniqueChars = 1;

            // Lockout settings
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.AllowedForNewUsers = true;

            // User settings
            options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
            options.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        // Caching
        services.AddMemoryCache();
        services.AddSingleton<ICacheService, MemoryCacheService>();

        // Response compression
        services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;
            options.Providers.Add<GzipCompressionProvider>();
            options.MimeTypes = new[]
            {
                "application/json",
                "text/plain",
                "text/html",
                "text/css",
                "text/javascript",
                "application/javascript"
            };
        });

        // SignalR
        services.AddSignalR();

        return services;
    }

    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtSettings = configuration.GetSection("JwtSettings");
        var key = Encoding.ASCII.GetBytes(jwtSettings["Secret"]!);

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = jwtSettings["Issuer"],
                ValidateAudience = true,
                ValidAudience = jwtSettings["Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
        })
        .AddGoogle(options =>
        {
            var googleSettings = configuration.GetSection("OAuth:Google");
            options.ClientId = googleSettings["ClientId"]!;
            options.ClientSecret = googleSettings["ClientSecret"]!;
        })
        .AddFacebook(options =>
        {
            var facebookSettings = configuration.GetSection("OAuth:Facebook");
            options.AppId = facebookSettings["AppId"]!;
            options.AppSecret = facebookSettings["AppSecret"]!;
        });

        return services;
    }

    public static IServiceCollection AddBusinessServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<INeedService, NeedService>();
        services.AddScoped<IOfferService, OfferService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IMessageService, MessageService>();
        services.AddScoped<IReviewService, ReviewService>();
        services.AddScoped<ISearchService, SearchService>();
        services.AddScoped<IRecommendationService, RecommendationService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<QueryOptimizationService>();
        services.AddHttpClient<FacebookService>();
        
        // Background services
        services.AddHostedService<GuestCleanupService>();
        
        // Security services
        // services.AddScoped<API.Interfaces.IInputSanitizationService, InputSanitizationService>();
        
        return services;
    }

    public static IServiceCollection AddCorsPolicy(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("AllowMobile", policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            });

            options.AddPolicy("AllowSignalR", policy =>
            {
                policy.WithOrigins(
                        "http://localhost:8081",
                        "exp://192.168.1.7:8081",  // Updated IP
                        "exp://192.168.1.100:8081",
                        "http://192.168.1.7:8081"  // Added HTTP variant
                      )
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            });
        });

        return services;
    }
}