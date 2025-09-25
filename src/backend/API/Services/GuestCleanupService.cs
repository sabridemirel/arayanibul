using API.Interfaces;

namespace API.Services;

public class GuestCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<GuestCleanupService> _logger;
    private readonly TimeSpan _period = TimeSpan.FromHours(24); // Run daily

    public GuestCleanupService(IServiceProvider serviceProvider, ILogger<GuestCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
                
                _logger.LogInformation("Starting guest session cleanup...");
                await authService.CleanupExpiredGuestSessionsAsync();
                _logger.LogInformation("Guest session cleanup completed.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during guest session cleanup");
            }

            await Task.Delay(_period, stoppingToken);
        }
    }
}