/**
 * Simple In-Memory Cache Utility
 * Provides caching for frequently accessed data to improve performance
 */

/**
 * Cache entry with value, timestamp, and TTL
 */
class CacheEntry {
  constructor(value, ttl = null) {
    this.value = value;
    this.createdAt = Date.now();
    this.ttl = ttl; // Time to live in milliseconds, null = no expiration
  }

  isExpired() {
    if (this.ttl === null) return false;
    return Date.now() - this.createdAt > this.ttl;
  }
}

/**
 * Simple in-memory cache with TTL support
 */
class Cache {
  constructor(options = {}) {
    this.store = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || null; // null = no expiration
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.store.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    if (entry.isExpired()) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number|null} ttl - Time to live in milliseconds (optional, uses default if not provided)
   */
  set(key, value, ttl = null) {
    // Evict oldest entry if at max size
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictOldest();
    }

    const entryTTL = ttl !== null ? ttl : this.defaultTTL;
    this.store.set(key, new CacheEntry(value, entryTTL));
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.isExpired()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete entry from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if entry was deleted
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total).toFixed(2) : 0,
      maxSize: this.maxSize
    };
  }

  /**
   * Evict oldest entry (FIFO)
   */
  evictOldest() {
    if (this.store.size === 0) return;
    
    const firstKey = this.store.keys().next().value;
    this.store.delete(firstKey);
  }

  /**
   * Clean expired entries
   * @returns {number} Number of entries removed
   */
  cleanExpired() {
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.isExpired()) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }
}

// Create singleton instances for different cache types
const moduleCache = new Cache({ maxSize: 500, defaultTTL: 3600000 }); // 1 hour
const complexityCache = new Cache({ maxSize: 200, defaultTTL: null }); // No expiration
const domainKnowledgeCache = new Cache({ maxSize: 100, defaultTTL: 1800000 }); // 30 minutes

module.exports = {
  Cache,
  CacheEntry,
  moduleCache,
  complexityCache,
  domainKnowledgeCache
};

