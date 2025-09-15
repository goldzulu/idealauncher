/**
 * Client-side caching utilities for performance optimization
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class ClientCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get cached data if valid, otherwise return null
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Set cached data with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  /**
   * Remove specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Global cache instance
export const clientCache = new ClientCache()

// Cache key generators
export const cacheKeys = {
  ideas: (userId: string) => `ideas:${userId}`,
  idea: (ideaId: string) => `idea:${ideaId}`,
  chatHistory: (ideaId: string) => `chat:${ideaId}`,
  research: (ideaId: string, type: string) => `research:${ideaId}:${type}`,
  scores: (ideaId: string) => `scores:${ideaId}`,
  features: (ideaId: string) => `features:${ideaId}`,
  exports: (ideaId: string) => `exports:${ideaId}`,
  domainCheck: (names: string[]) => `domains:${names.sort().join(',')}`,
}

// Cache invalidation helpers
export const invalidateCache = {
  idea: (ideaId: string) => {
    clientCache.delete(cacheKeys.idea(ideaId))
    clientCache.delete(cacheKeys.chatHistory(ideaId))
    clientCache.delete(cacheKeys.scores(ideaId))
    clientCache.delete(cacheKeys.features(ideaId))
  },
  
  ideas: (userId: string) => {
    clientCache.delete(cacheKeys.ideas(userId))
  },
  
  research: (ideaId: string, type?: string) => {
    if (type) {
      clientCache.delete(cacheKeys.research(ideaId, type))
    } else {
      // Clear all research for this idea
      const stats = clientCache.getStats()
      stats.keys.forEach(key => {
        if (key.startsWith(`research:${ideaId}:`)) {
          clientCache.delete(key)
        }
      })
    }
  }
}

// Cached API wrapper
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try cache first
  const cached = clientCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch and cache
  const data = await fetcher()
  clientCache.set(key, data, ttl)
  return data
}

// Optimistic update helper
export function optimisticUpdate<T>(
  key: string,
  updater: (current: T | null) => T,
  ttl?: number
): void {
  const current = clientCache.get<T>(key)
  const updated = updater(current)
  clientCache.set(key, updated, ttl)
}

// Periodic cleanup (run every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    clientCache.cleanup()
  }, 5 * 60 * 1000)
}