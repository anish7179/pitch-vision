// ============================================
// src/config/redisClient.js
// ============================================
// Redis connection via ioredis with graceful degradation.
//
// DESIGN DECISION — Graceful Degradation:
// Redis is a CACHE LAYER, not a primary data store.
// If Redis is unavailable (down, restarting, unreachable),
// the server MUST continue to function by falling back to
// direct MongoDB queries or API calls. We achieve this by:
//   1. Never throwing on connection errors
//   2. Wrapping every get/set in try-catch
//   3. Returning null on cache miss OR error (caller can't
//      distinguish — both trigger a cache-miss code path)
//
// INTERVIEW CONCEPT — ioredis vs. node-redis:
// ioredis provides automatic reconnection with exponential
// backoff out of the box, Cluster/Sentinel support, and
// Lua scripting. node-redis v4+ has caught up, but ioredis
// remains the gold standard for production Node.js apps.
//
// INTERVIEW CONCEPT — Cache-Aside Pattern:
// Our helpers implement the cache-aside (lazy-loading) pattern:
//   1. Caller asks getCache(key)
//   2. Cache hit → return cached data
//   3. Cache miss → caller fetches from source, then calls
//      setCache(key, data, ttl) to populate the cache
// This is simpler than write-through or write-behind and
// works well when reads vastly outnumber writes.
// ============================================

import Redis from 'ioredis';
import env from './env.js';

// ── Create Redis Client ──────────────────────────────────────
// ioredis automatically reconnects with exponential backoff.
// We configure it to:
//   - Retry up to 20 times before giving up
//   - Cap retry delay at 3 seconds
//   - Not crash the process on connection failure
const redisClient = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,      // Don't reject commands during reconnect
  enableReadyCheck: true,          // Wait for READY before accepting commands
  retryStrategy(times) {
    if (times > 20) {
      console.error('🔴  [Redis] Max reconnection attempts (20) exhausted. Giving up.');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 200, 3000); // Cap at 3s
    console.warn(`🟡  [Redis] Reconnecting in ${delay}ms (attempt ${times}/20)...`);
    return delay;
  },
  // Disable offline queue — if Redis is down, commands fail
  // immediately instead of queuing up in memory (prevents
  // unbounded memory growth during extended outages)
  enableOfflineQueue: false,
});

// ── Connection Lifecycle Logging ─────────────────────────────
redisClient.on('connect', () => {
  console.log('🔌  [Redis] TCP connection established');
});

redisClient.on('ready', () => {
  console.log('✅  [Redis] Ready to accept commands');
});

redisClient.on('error', (err) => {
  // Log but NEVER crash. This fires on every failed reconnect
  // attempt, so we keep it terse to avoid log spam.
  console.error(`🔴  [Redis] Error: ${err.message}`);
});

redisClient.on('close', () => {
  console.warn('🟡  [Redis] Connection closed');
});

redisClient.on('reconnecting', (delay) => {
  // ioredis handles this internally via retryStrategy
});

// ── Cache Helpers ────────────────────────────────────────────

/**
 * Read a cached value from Redis.
 * Returns parsed JSON on hit, null on miss or error.
 *
 * @param {string} key - The cache key
 * @returns {Promise<any|null>} Parsed data or null
 */
export const getCache = async (key) => {
  try {
    const raw = await redisClient.get(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (err) {
    // Redis down or parse error — treat as cache miss
    console.warn(`⚠️  [Redis] getCache("${key}") failed: ${err.message}`);
    return null;
  }
};

/**
 * Write a value to Redis with a TTL (time-to-live).
 * Silently fails if Redis is unavailable.
 *
 * @param {string} key - The cache key
 * @param {any} data - Data to cache (will be JSON-serialized)
 * @param {number} ttlSeconds - Time-to-live in seconds (default: 300 = 5 min)
 * @returns {Promise<boolean>} true if written, false on error
 */
export const setCache = async (key, data, ttlSeconds = 300) => {
  try {
    await redisClient.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    return true;
  } catch (err) {
    console.warn(`⚠️  [Redis] setCache("${key}") failed: ${err.message}`);
    return false;
  }
};

/**
 * Delete a cached key from Redis.
 * Silently fails if Redis is unavailable.
 *
 * @param {string} key - The cache key to delete
 * @returns {Promise<boolean>} true if deleted, false on error
 */
export const delCache = async (key) => {
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.warn(`⚠️  [Redis] delCache("${key}") failed: ${err.message}`);
    return false;
  }
};

/**
 * Get the Redis connection status string.
 * Used by the health check endpoint.
 *
 * @returns {string} 'ready' | 'connecting' | 'reconnecting' | 'end' | 'close' | 'wait'
 */
export const getRedisStatus = () => {
  return redisClient.status;
};

export default redisClient;
