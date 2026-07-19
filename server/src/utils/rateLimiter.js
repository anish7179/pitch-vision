// ============================================
// src/utils/rateLimiter.js
// ============================================
// Atomic daily quota tracker for API-Football free tier.
//
// INTERVIEW CONCEPT — Atomic Operations:
// We use MongoDB's `findOneAndUpdate` with `$inc` (atomic
// increment). This is critical in concurrent environments:
//
//   Thread A reads count = 89
//   Thread B reads count = 89
//   Thread A writes count = 90  ← Both think they're #90
//   Thread B writes count = 90  ← LOST UPDATE! Count should be 91
//
// With `$inc`, MongoDB handles this at the storage engine level:
//
//   Thread A: findOneAndUpdate($inc: 1) → returns 90 atomically
//   Thread B: findOneAndUpdate($inc: 1) → returns 91 atomically
//
// No race conditions, no locks needed in application code.
//
// INTERVIEW CONCEPT — Why Not an In-Memory Counter?
// If we used a variable in Node.js memory:
//   1. It resets on every server restart
//   2. It doesn't work with multiple server instances (horizontal scaling)
// MongoDB is the source of truth that survives restarts and is
// shared across all instances.
// ============================================

import mongoose from 'mongoose';
import env from '../config/env.js';

// ── Schema for the daily usage counter ───────────────────────
const apiUsageSchema = new mongoose.Schema(
  {
    date: {
      type: String, // "YYYY-MM-DD" format
      required: true,
      unique: true,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: false }
);

const ApiUsage = mongoose.model('ApiUsage', apiUsageSchema);

/**
 * Get today's date string in UTC (YYYY-MM-DD).
 * Using UTC avoids timezone-related double-counting.
 *
 * @returns {string}
 */
const getTodayUTC = () => {
  return new Date().toISOString().slice(0, 10);
};

/**
 * Check if we can make another API-Football call today.
 * Does NOT increment the counter — this is a read-only check.
 *
 * @returns {Promise<{ allowed: boolean, count: number, limit: number, remaining: number }>}
 */
export const checkQuota = async () => {
  const today = getTodayUTC();
  const usage = await ApiUsage.findOne({ date: today });
  const count = usage ? usage.count : 0;
  const limit = env.apiFootballDailyLimit;

  return {
    allowed: count < limit,
    count,
    limit,
    remaining: Math.max(0, limit - count),
  };
};

/**
 * Attempt to consume one API call from today's quota.
 * Uses atomic $inc to prevent race conditions.
 *
 * Returns the NEW count after increment, or null if quota exhausted.
 *
 * @returns {Promise<{ consumed: boolean, count: number, remaining: number }>}
 */
export const consumeQuota = async () => {
  const today = getTodayUTC();
  const limit = env.apiFootballDailyLimit;

  // Atomically increment and return the NEW document
  const result = await ApiUsage.findOneAndUpdate(
    { date: today },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );

  // If the count AFTER increment exceeds the limit, roll back
  if (result.count > limit) {
    // Decrement back — we went over
    await ApiUsage.findOneAndUpdate(
      { date: today },
      { $inc: { count: -1 } }
    );

    return {
      consumed: false,
      count: result.count - 1,
      remaining: 0,
    };
  }

  return {
    consumed: true,
    count: result.count,
    remaining: Math.max(0, limit - result.count),
  };
};

/**
 * Get the current usage stats without modifying anything.
 * Useful for dashboard/status endpoints.
 *
 * @returns {Promise<{ date: string, count: number, limit: number, remaining: number }>}
 */
export const getUsageStats = async () => {
  const today = getTodayUTC();
  const usage = await ApiUsage.findOne({ date: today });
  const count = usage ? usage.count : 0;
  const limit = env.apiFootballDailyLimit;

  return {
    date: today,
    count,
    limit,
    remaining: Math.max(0, limit - count),
  };
};

export default { checkQuota, consumeQuota, getUsageStats };
