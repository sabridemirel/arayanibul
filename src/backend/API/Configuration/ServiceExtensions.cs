using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.Caching.Memory;
using System.Text;
using System.IO.Compression;
using API.Data;
using API.Models;
using API.Services;
using API.Interfaces;

namespace API.Configuration;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment environment)
    {
        // Database - Always use PostgreSQL
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Database=arayanibul;Username=postgres;Password=Arayanibul2024";

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString));

        // Health checks for PostgreSQL
        services.AddHealthChecks()
            .AddNpgSql(connectionString, name: "database");

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

            // Browsers cannot set an Authorization header on WebSocket/SSE requests, so the
            // SignalR client sends the JWT as ?access_token=... — accept it for the hub only.
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    if (!string.IsNullOrEmpty(accessToken) &&
                        context.HttpContext.Request.Path.StartsWithSegments("/chathub"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                },

                // Reject tokens of deleted (anonymized + locked out) or removed users.
                // Cached briefly so this costs at most one DB lookup per user per minute.
                OnTokenValidated = async context =>
                {
                    var userId = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                    if (string.IsNullOrEmpty(userId))
                    {
                        context.Fail("Token has no user id");
                        return;
                    }

                    var cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();
                    var cacheKey = AuthCacheKeys.UserActive(userId);
                    if (!cache.TryGetValue(cacheKey, out bool isActive))
                    {
                        var userManager = context.HttpContext.RequestServices.GetRequiredService<UserManager<ApplicationUser>>();
                        var user = await userManager.FindByIdAsync(userId);
                        isActive = user != null && !await userManager.IsLockedOutAsync(user);
                        cache.Set(cacheKey, isActive, TimeSpan.FromSeconds(60));
                    }

                    if (!isActive)
                    {
                        context.Fail("User account is deleted or locked");
                    }
                }
            };
        });

        // Add Google OAuth if configured
        var googleSettings = configuration.GetSection("OAuth:Google");
        var googleClientId = googleSettings["ClientId"];
        if (!string.IsNullOrEmpty(googleClientId))
        {
            services.AddAuthentication().AddGoogle(options =>
            {
                options.ClientId = googleClientId;
                options.ClientSecret = googleSettings["ClientSecret"]!;
            });
        }

        // Add Facebook OAuth if configured
        var facebookSettings = configuration.GetSection("OAuth:Facebook");
        var facebookAppId = facebookSettings["AppId"];
        if (!string.IsNullOrEmpty(facebookAppId))
        {
            services.AddAuthentication().AddFacebook(options =>
            {
                options.AppId = facebookAppId;
                options.AppSecret = facebookSettings["AppSecret"]!;
            });
        }

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
        services.AddScoped<IVerificationService, VerificationService>();
        services.AddScoped<ISmsService, MockSmsService>(); // Use MockSmsService for development
        services.AddScoped<QueryOptimizationService>();
        services.AddHttpClient<FacebookService>();
        services.AddSingleton<AppleTokenValidator>();
        services.AddScoped<IEmailService, SmtpEmailService>();
        services.AddScoped<IAccountDeletionService, AccountDeletionService>();

        // Background services
        services.AddHostedService<GuestCleanupService>();

        // Security services
        // services.AddScoped<API.Interfaces.IInputSanitizationService, InputSanitizationService>();

        return services;
    }

    public static IServiceCollection AddCorsPolicy(this IServiceCollection services, IConfiguration configuration)
    {
        // Get allowed origins from configuration (for production)
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

        services.AddCors(options =>
        {
            options.AddPolicy("AllowMobile", policy =>
            {
                if (allowedOrigins.Length > 0)
                {
                    // Production: use configured origins
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .AllowCredentials();
                }
                else
                {
                    // Development: allow any origin
                    policy.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader();
                }
            });

            options.AddPolicy("AllowSignalR", policy =>
            {
                var signalROrigins = allowedOrigins.Length > 0
                    ? allowedOrigins
                    : new[] {
                        "http://localhost:3000", // web (Docker)
                        "http://localhost:5173", // web (Vite dev)
                        "http://localhost:8081",
                        "exp://192.168.1.7:8081",
                        "exp://192.168.1.100:8081",
                        "http://192.168.1.7:8081"
                      };

                policy.WithOrigins(signalROrigins)
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            });
        });

        return services;
    }
}