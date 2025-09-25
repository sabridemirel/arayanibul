import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface BatchRequest {
  id: string;
  endpoint: string;
  params?: any;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}

class OptimizedApiService {
  private static instance: OptimizedApiService;
  private cache = new Map<string, CacheEntry<any>>();
  private batchQueue: BatchRequest[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // ms
  private readonly DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

  static getInstance(): OptimizedApiService {
    if (!OptimizedApiService.instance) {
      OptimizedApiService.instance = new OptimizedApiService();
    }
    return OptimizedApiService.instance;
  }

  async get<T>(
    endpoint: string, 
    params?: any, 
    options?: { 
      cache?: boolean; 
      cacheTime?: number;
      batch?: boolean;
    }
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(endpoint, params);
    const useCache = options?.cache !== false;
    const useBatch = options?.batch === true;

    // Check cache first
    if (useCache) {
      const cachedData = await this.getFromCache<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Use batching if requested
    if (useBatch) {
      return this.batchRequest<T>(endpoint, params);
    }

    // Make direct request
    const data = (await api.get<T>(endpoint, { params })).data as T;
    
    // Cache the result
    if (useCache) {
      await this.setCache(
        cacheKey, 
        data, 
        options?.cacheTime || this.DEFAULT_CACHE_TIME
      );
    }

    return data;
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    // Clear related cache entries
    this.clearRelatedCache(endpoint);
    return (await api.post<T>(endpoint, data)).data as T;
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    // Clear related cache entries
    this.clearRelatedCache(endpoint);
    return (await api.put<T>(endpoint, data)).data as T;
  }

  async delete<T>(endpoint: string): Promise<T> {
    // Clear related cache entries
    this.clearRelatedCache(endpoint);
    return (await api.delete<T>(endpoint)).data as T;
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('@api_cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Failed to clear API cache:', error);
    }
  }

  async getCacheStats(): Promise<{ entries: number; memorySize: number }> {
    const memorySize = JSON.stringify(Array.from(this.cache.entries())).length;
    return {
      entries: this.cache.size,
      memorySize,
    };
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.cache.get(key);
    if (memoryEntry && Date.now() < memoryEntry.expiry) {
      return memoryEntry.data;
    }

    // Check persistent cache
    try {
      const persistentData = await AsyncStorage.getItem(`@api_cache_${key}`);
      if (persistentData) {
        const entry: CacheEntry<T> = JSON.parse(persistentData);
        if (Date.now() < entry.expiry) {
          // Restore to memory cache
          this.cache.set(key, entry);
          return entry.data;
        } else {
          // Remove expired entry
          await AsyncStorage.removeItem(`@api_cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Failed to get from cache:', error);
    }

    return null;
  }

  private async setCache<T>(key: string, data: T, cacheTime: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + cacheTime,
    };

    // Set in memory cache
    this.cache.set(key, entry);

    // Set in persistent cache
    try {
      await AsyncStorage.setItem(`@api_cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to set cache:', error);
    }
  }

  private generateCacheKey(endpoint: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}_${paramString}`.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private clearRelatedCache(endpoint: string): void {
    // Clear memory cache entries that match the endpoint
    for (const [key] of this.cache.entries()) {
      if (key.includes(endpoint.split('/')[1])) {
        this.cache.delete(key);
      }
    }

    // Clear persistent cache (async, don't wait)
    this.clearPersistentRelatedCache(endpoint);
  }

  private async clearPersistentRelatedCache(endpoint: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const relatedKeys = keys.filter(key => 
        key.startsWith('@api_cache_') && 
        key.includes(endpoint.split('/')[1])
      );
      await AsyncStorage.multiRemove(relatedKeys);
    } catch (error) {
      console.warn('Failed to clear related cache:', error);
    }
  }

  private batchRequest<T>(endpoint: string, params?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `${endpoint}_${Date.now()}_${Math.random()}`;
      
      this.batchQueue.push({
        id: requestId,
        endpoint,
        params,
        resolve,
        reject,
      });

      // Set or reset batch timeout
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }

      this.batchTimeout = setTimeout(() => {
        this.processBatch();
      }, this.BATCH_DELAY);
    });
  }

  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const currentBatch = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimeout = null;

    // Group requests by endpoint
    const groupedRequests = currentBatch.reduce((groups, request) => {
      const key = request.endpoint;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(request);
      return groups;
    }, {} as Record<string, BatchRequest[]>);

    // Process each group
    for (const [endpoint, requests] of Object.entries(groupedRequests)) {
      try {
        // For now, just make individual requests
        // In a real implementation, you'd modify the API to support batch requests
        const promises = requests.map(async (request) => {
          try {
            const data = (await api.get(request.endpoint, { params: request.params })).data;
            request.resolve(data as any);
          } catch (error) {
            request.reject(error);
          }
        });

        await Promise.all(promises);
      } catch (error) {
        // Reject all requests in this group
        requests.forEach(request => request.reject(error));
      }
    }
  }
}

export const optimizedApiService = OptimizedApiService.getInstance();
