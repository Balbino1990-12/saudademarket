/**
 * Cache Service
 * Provides Redis-based caching for frequently accessed data
 * Can be extended to other Redis features like pub/sub
 */

const { getRedisClient, isRedisConnected } = require('../config/redis');

// Fallback in-memory cache for when Redis is not available
const NodeCache = require('node-cache');
const fallbackCache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false // Don't clone objects for better performance
});

// Get Redis client
const redisClient = getRedisClient();

class CacheService {
  /**
   * Get cached data or execute function if not cached
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Function to execute if not cached
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<any>} Cached or fresh data
   */
  static async getOrSet(key, fetchFunction, ttl = null) {
    try {
      // Use Redis if connected, otherwise fallback to in-memory cache
      if (isRedisConnected()) {
        // Check if data is cached in Redis
        const cachedData = await redisClient.get(key);
        if (cachedData !== null) {
          console.log(`[Cache] HIT (Redis): ${key}`);
          return JSON.parse(cachedData);
        }

        console.log(`[Cache] MISS (Redis): ${key}`);
        // Execute fetch function
        const data = await fetchFunction();

        // Cache the result in Redis
        const cacheTTL = ttl || CacheService.CACHE_TTL.MEDIUM;
        await redisClient.setEx(key, cacheTTL, JSON.stringify(data));

        return data;
      } else {
        // Fallback to in-memory cache
        const cachedData = fallbackCache.get(key);
        if (cachedData !== undefined) {
          console.log(`[Cache] HIT (Memory): ${key}`);
          return cachedData;
        }

        console.log(`[Cache] MISS (Memory): ${key}`);
        // Execute fetch function
        const data = await fetchFunction();

        // Cache the result in memory
        const cacheTTL = ttl || CacheService.CACHE_TTL.MEDIUM;
        fallbackCache.set(key, data, cacheTTL);

        return data;
      }
    } catch (error) {
      console.error(`[Cache] Error for key ${key}:`, error);
      // If caching fails, execute function directly
      return await fetchFunction();
    }
  }

  /**
   * Set cache data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  static async set(key, data, ttl = null) {
    try {
      const cacheTTL = ttl || CacheService.CACHE_TTL.MEDIUM;

      if (isRedisConnected()) {
        await redisClient.setEx(key, cacheTTL, JSON.stringify(data));
        console.log(`[Cache] SET (Redis): ${key} (TTL: ${cacheTTL}s)`);
      } else {
        fallbackCache.set(key, data, cacheTTL);
        console.log(`[Cache] SET (Memory): ${key} (TTL: ${cacheTTL}s)`);
      }
    } catch (error) {
      console.error(`[Cache] Error setting key ${key}:`, error);
    }
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached data or null
   */
  static async get(key) {
    try {
      if (isRedisConnected()) {
        const data = await redisClient.get(key);
        if (data !== null) {
          console.log(`[Cache] HIT (Redis): ${key}`);
          return JSON.parse(data);
        } else {
          console.log(`[Cache] MISS (Redis): ${key}`);
          return null;
        }
      } else {
        const data = fallbackCache.get(key);
        if (data !== undefined) {
          console.log(`[Cache] HIT (Memory): ${key}`);
          return data;
        } else {
          console.log(`[Cache] MISS (Memory): ${key}`);
          return null;
        }
      }
    } catch (error) {
      console.error(`[Cache] Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete cached data
   * @param {string} key - Cache key
   */
  static async del(key) {
    try {
      if (isRedisConnected()) {
        const deleted = await redisClient.del(key);
        if (deleted) {
          console.log(`[Cache] DEL (Redis): ${key}`);
        }
        return deleted;
      } else {
        const deleted = fallbackCache.del(key);
        if (deleted) {
          console.log(`[Cache] DEL (Memory): ${key}`);
        }
        return deleted;
      }
    } catch (error) {
      console.error(`[Cache] Error deleting key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Delete cached keys by key pattern
   * @param {string} pattern - Substring or prefix to match cache keys
   * @returns {Promise<number>} Number of keys deleted
   */
  static async delByPattern(pattern) {
    try {
      if (isRedisConnected()) {
        const keys = await redisClient.keys(`*${pattern}*`);
        if (keys.length > 0) {
          const deleted = await redisClient.del(keys);
          console.log(`[Cache] DEL BY PATTERN (Redis): ${pattern} (${deleted} keys)`);
          return deleted;
        }
        return 0;
      } else {
        const keys = fallbackCache.keys().filter((key) => key.includes(pattern));
        if (keys.length > 0) {
          fallbackCache.del(keys);
          console.log(`[Cache] DEL BY PATTERN (Memory): ${pattern} (${keys.length} keys)`);
          return keys.length;
        }
        return 0;
      }
    } catch (error) {
      console.error(`[Cache] Error deleting by pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Clear all cached data
   */
  static async flushAll() {
    try {
      if (isRedisConnected()) {
        await redisClient.flushAll();
        console.log('[Cache] FLUSH ALL (Redis)');
      } else {
        fallbackCache.flushAll();
        console.log('[Cache] FLUSH ALL (Memory)');
      }
    } catch (error) {
      console.error('[Cache] Error flushing all:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  static async getStats() {
    try {
      if (isRedisConnected()) {
        const info = await redisClient.info();
        return {
          type: 'redis',
          connected: true,
          info: info
        };
      } else {
        return {
          type: 'memory',
          connected: false,
          stats: fallbackCache.getStats()
        };
      }
    } catch (error) {
      console.error('[Cache] Error getting stats:', error);
      return {
        type: 'error',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Cache keys for different data types
   */
  static get CACHE_KEYS() {
    return {
      // Categories
      CATEGORIES_ALL: 'categories:all',
      CATEGORIES_ACTIVE: 'categories:active',
      CATEGORY_BY_ID: (id) => `category:id:${id}`,
      CATEGORY_PRODUCTS: (id) => `category:products:${id}`,

      // Products
      PRODUCTS_ALL: 'products:all',
      PRODUCTS_BY_CATEGORY: (categoryId) => `products:category:${categoryId}`,
      PRODUCT_BY_ID: (id) => `product:id:${id}`,

      // Users
      USERS_ALL: 'users:all',
      USER_BY_ID: (id) => `user:id:${id}`,

      // Cart
      CART_BY_USER: (userId) => `cart:user:${userId}`,

      // Specialties
      SPECIALTIES_ALL: 'specialties:all',
      SPECIALTY_BY_ID: (id) => `specialty:id:${id}`
    };
  }

  /**
   * Cache TTL values (in seconds)
   */
  static get CACHE_TTL() {
    return {
      SHORT: 60,      // 1 minute
      MEDIUM: 300,    // 5 minutes
      LONG: 1800,     // 30 minutes
      VERY_LONG: 3600 // 1 hour
    };
  }
}

module.exports = CacheService;