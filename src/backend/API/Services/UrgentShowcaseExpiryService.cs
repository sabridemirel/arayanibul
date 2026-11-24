using API.Interfaces;

namespace API.Services;

/// <summary>
/// Periodically drops urgent needs whose "Acil İlanlar" showcase slot has ended back to Normal.
/// </summary>
public class UrgentShowcaseExpiryService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<UrgentShowcaseExpiryService> _logger;
    private readonly TimeSpan _period = TimeSpan.FromMinutes(15);

    public UrgentShowcaseExpiryService(IServiceProvider serviceProvider, ILogger<UrgentShowcaseExpiryService> logger)
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
                var needService = scope.ServiceProvider.GetRequiredService<INeedService>();
                var count = await needService.ExpireUrgentShowcasesAsync();
                if (count > 0)
                {
                    _logger.LogInformation("Urgent showcase ended for {Count} need(s).", count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while expiring urgent showcases");
            }

            await Task.Delay(_period, stoppingToken);
        }
    }
}
