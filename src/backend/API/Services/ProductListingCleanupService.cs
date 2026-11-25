using API.Interfaces;

namespace API.Services;

/// <summary>Runs the product-listing housekeeping (unanswered at-price offers, ended listings).</summary>
public class ProductListingCleanupService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(15);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ProductListingCleanupService> _logger;

    public ProductListingCleanupService(IServiceScopeFactory scopeFactory, ILogger<ProductListingCleanupService> logger)
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
                await scope.ServiceProvider.GetRequiredService<IProductPricingService>().CloseStaleListingsAsync();
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Product listing cleanup failed");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
