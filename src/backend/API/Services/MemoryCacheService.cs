using Microsoft.Extensions.Caching.Memory;
using API.Interfaces;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace API.Services;

public class MemoryCacheService : ICacheService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<MemoryCacheService> _logger;
    private readonly HashSet<string> _cacheKeys = new();
    private readonly object _lockObject = new();

    public MemoryCacheService(IMemoryCache cache, ILogger<MemoryCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public Task<T?> GetAsync<T>(string key) where T : class
    {
        try
        {
            if (_cache.TryGetValue(key, out var cachedValue))
            {
                if (cachedValue is string jsonString)
                {
                    var result = JsonSerializer.Deserialize<T>(jsonString);
                    _logger.LogDebug("Cache hit for key: {Key}", key);
                    return Task.FromResult(result);
                }
                
                if (cachedValue is T directValue)
                {
                    _logger.LogDebug("Cache hit for key: {Key}", key);
                    return Task.FromResult(directValue);
                }
            }

            _logger.LogDebug("Cache miss for key: {Key}", key);
            return Task.FromResult<T?>(null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cache value for key: {Key}", key);
            return Task.FromResult<T?>(null);
        }
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class
    {
        try
        {
            var options = new MemoryCacheEntryOptions();
            
            if (expiration.HasValue)
            {
                options.AbsoluteExpirationRelativeToNow = expiration.Value;
            }
            else
            {
                // Default expiration of 30 minutes
                options.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);
            }

            // Set sliding expiration to half of absolute expiration
            options.SlidingExpiration = TimeSpan.FromMinutes(options.AbsoluteExpirationRelativeToNow?.TotalMinutes / 2 ?? 15);

            // Register callback to remove key from tracking set
            options.RegisterPostEvictionCallback((evictedKey, evictedValue, reason, state) =>
            {
                lock (_lockObject)
                {
                    _cacheKeys.Remove(evictedKey.ToString()!);
                }
                _logger.LogDebug("Cache entry evicted: {Key}, Reason: {Reason}", evictedKey, reason);
            });

            var serializerOptions = new JsonSerializerOptions
            {
                ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
            };
            var jsonString = JsonSerializer.Serialize(value, serializerOptions);
            _cache.Set(key, jsonString, options);

            lock (_lockObject)
            {
                _cacheKeys.Add(key);
            }

            _logger.LogDebug("Cache set for key: {Key}, Expiration: {Expiration}", key, expiration);
            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting cache value for key: {Key}", key);
            return Task.CompletedTask;
        }
    }

    public Task RemoveAsync(string key)
    {
        try
        {
            _cache.Remove(key);
            
            lock (_lockObject)
            {
                _cacheKeys.Remove(key);
            }

            _logger.LogDebug("Cache removed for key: {Key}", key);
            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache value for key: {Key}", key);
            return Task.CompletedTask;
        }
    }

    public Task RemovePatternAsync(string pattern)
    {
        try
        {
            var regex = new Regex(pattern, RegexOptions.IgnoreCase);
            var keysToRemove = new List<string>();

            lock (_lockObject)
            {
                keysToRemove.AddRange(_cacheKeys.Where(key => regex.IsMatch(key)));
            }

            foreach (var key in keysToRemove)
            {
                _cache.Remove(key);
                lock (_lockObject)
                {
                    _cacheKeys.Remove(key);
                }
            }

            _logger.LogDebug("Cache pattern removed: {Pattern}, Keys removed: {Count}", pattern, keysToRemove.Count);
            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache pattern: {Pattern}", pattern);
            return Task.CompletedTask;
        }
    }

    public Task<bool> ExistsAsync(string key)
    {
        try
        {
            var exists = _cache.TryGetValue(key, out _);
            return Task.FromResult(exists);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking cache existence for key: {Key}", key);
            return Task.FromResult(false);
        }
    }
}