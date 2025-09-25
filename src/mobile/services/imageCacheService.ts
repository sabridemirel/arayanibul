import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface CacheEntry {
  uri: string;
  timestamp: number;
  size: number;
}

class ImageCacheService {
  private static instance: ImageCacheService;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_KEY = '@image_cache';
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
  private currentCacheSize = 0;

  static getInstance(): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService();
    }
    return ImageCacheService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cacheData) {
        const parsedCache = JSON.parse(cacheData);
        this.cache = new Map(parsedCache);
        this.calculateCacheSize();
        await this.cleanExpiredEntries();
      }
    } catch (error) {
      console.warn('Failed to initialize image cache:', error);
    }
  }

  async getCachedImageUri(originalUri: string): Promise<string | null> {
    const cacheKey = this.generateCacheKey(originalUri);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.CACHE_EXPIRY) {
      this.cache.delete(cacheKey);
      await this.persistCache();
      return null;
    }

    return entry.uri;
  }

  async cacheImage(originalUri: string, cachedUri: string, size: number): Promise<void> {
    const cacheKey = this.generateCacheKey(originalUri);
    
    // Check if we need to make space
    if (this.currentCacheSize + size > this.MAX_CACHE_SIZE) {
      await this.evictOldEntries(size);
    }

    const entry: CacheEntry = {
      uri: cachedUri,
      timestamp: Date.now(),
      size,
    };

    this.cache.set(cacheKey, entry);
    this.currentCacheSize += size;
    await this.persistCache();
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    this.currentCacheSize = 0;
    await AsyncStorage.removeItem(this.CACHE_KEY);
  }

  async getCacheSize(): Promise<number> {
    return this.currentCacheSize;
  }

  async getCacheStats(): Promise<{ size: number; entries: number; maxSize: number }> {
    return {
      size: this.currentCacheSize,
      entries: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }

  private generateCacheKey(uri: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < uri.length; i++) {
      const char = uri.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  private calculateCacheSize(): void {
    this.currentCacheSize = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  private async cleanExpiredEntries(): Promise<void> {
    const now = Date.now();
    let hasChanges = false;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_EXPIRY) {
        this.cache.delete(key);
        this.currentCacheSize -= entry.size;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await this.persistCache();
    }
  }

  private async evictOldEntries(requiredSpace: number): Promise<void> {
    // Sort entries by timestamp (oldest first)
    const sortedEntries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    let freedSpace = 0;
    const toRemove: string[] = [];

    for (const [key, entry] of sortedEntries) {
      toRemove.push(key);
      freedSpace += entry.size;
      
      if (freedSpace >= requiredSpace) {
        break;
      }
    }

    // Remove entries
    for (const key of toRemove) {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.currentCacheSize -= entry.size;
      }
    }

    await this.persistCache();
  }

  private async persistCache(): Promise<void> {
    try {
      const cacheArray = Array.from(this.cache.entries());
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheArray));
    } catch (error) {
      console.warn('Failed to persist image cache:', error);
    }
  }
}

export const imageCacheService = ImageCacheService.getInstance();