using API.Interfaces;

namespace API.Services;

/// <summary>
/// Announces newly published listings to the followers of their category. Runs as a short loop
/// instead of being called from each place a listing can go live (creation, admin approval), so a
/// listing is announced exactly once however it became public, and nothing is lost on a restart.
/// </summary>
public class NewNeedAlertService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NewNeedAlertService> _logger;

    public NewNeedAlertService(IServiceScopeFactory scopeFactory, ILogger<NewNeedAlertService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<ICategoryFollowService>();
                var announced = await service.NotifyFollowersOfNewNeedsAsync();
                if (announced > 0)
                {
                    _logger.LogInformation("Announced {Count} new need(s) to category followers", announced);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "New need alert pass failed");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
