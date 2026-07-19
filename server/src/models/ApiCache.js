// ============================================
// src/models/ApiCache.js
// ============================================
// MongoDB-backed cache for API-Football responses.
//
// INTERVIEW CONCEPT — TTL (Time-To-Live) Indexes:
// MongoDB supports TTL indexes on Date fields. A background
// thread runs every 60 seconds and deletes documents whose
// TTL-indexed field has passed. This gives us automatic cache
// expiration without any cron jobs or cleanup scripts.
//
//   db.apicaches.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
//
// expireAfterSeconds: 0 means "delete when the Date value itself
// is reached." We control TTL by setting expiresAt = now + duration
// when we insert the document.
//
// WHY MONGODB INSTEAD OF REDIS?
// Redis is the classic caching choice, but it's another service
// to provision, pay for, and maintain. MongoDB Atlas free tier
// gives us 512MB — more than enough for caching API responses.
// For our traffic volume (<100 API calls/day), the performance
// difference is negligible. This keeps our infra simple.
// ============================================

import mongoose from 'mongoose';

const apiCacheSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: [true, 'Cache key is required'],
      unique: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: [true, 'Endpoint path is required'],
    },
    params: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Cached data is required'],
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
  },
  {
    timestamps: false, // We manage fetchedAt manually
  }
);

// TTL index — MongoDB auto-deletes docs when expiresAt is reached
apiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Static method: look up a cached response by key.
 * Returns null if not found or expired (TTL may lag up to 60s).
 *
 * @param {string} key - The cache key to look up
 * @returns {Promise<object|null>} The cached data or null
 */
apiCacheSchema.statics.getCache = async function (key) {
  const entry = await this.findOne({
    cacheKey: key,
    // Double-check expiry in case TTL background thread hasn't swept yet
    expiresAt: { $gt: new Date() },
  });
  return entry ? entry.data : null;
};

/**
 * Static method: store an API response in the cache.
 * Uses upsert so that re-fetching the same endpoint overwrites
 * the old cache entry atomically.
 *
 * @param {string} key       - Unique cache key
 * @param {string} endpoint  - The API endpoint path
 * @param {object} params    - The query parameters used
 * @param {object} data      - The response data to cache
 * @param {number} ttlMs     - Time-to-live in milliseconds
 * @returns {Promise<void>}
 */
apiCacheSchema.statics.setCache = async function (key, endpoint, params, data, ttlMs) {
  const now = new Date();
  await this.findOneAndUpdate(
    { cacheKey: key },
    {
      cacheKey: key,
      endpoint,
      params,
      data,
      fetchedAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
    },
    { upsert: true, new: true }
  );
};

/**
 * Static method: get stale cache (ignores expiry).
 * Used as a fallback when the API quota is exhausted — better
 * to show slightly old data than no data at all.
 *
 * @param {string} key - The cache key to look up
 * @returns {Promise<{data: object, fetchedAt: Date}|null>}
 */
apiCacheSchema.statics.getStaleCache = async function (key) {
  const entry = await this.findOne({ cacheKey: key });
  return entry ? { data: entry.data, fetchedAt: entry.fetchedAt } : null;
};

const ApiCache = mongoose.model('ApiCache', apiCacheSchema);

export default ApiCache;
