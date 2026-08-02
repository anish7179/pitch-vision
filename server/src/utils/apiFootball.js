// ============================================
// src/utils/apiFootball.js
// ============================================
// Rate-limited, cache-backed API-Football client.
//
// Every outbound call flows through:
//   1. Check MongoDB cache for a fresh response
//   2. If cache miss → check daily quota
//   3. If quota available → make HTTP call → cache result → return
//   4. If quota exhausted → try stale cache → or return quota error
//
// INTERVIEW CONCEPT — Cache-Aside Pattern:
// This is the "Cache-Aside" (Lazy Loading) pattern:
//   - Application checks cache first
//   - On miss, application fetches from source and populates cache
//   - On next request, cache serves the data
//
// Contrast with "Write-Through" where every write goes to cache
// AND source simultaneously. Cache-Aside is simpler and better
// suited to our read-heavy, low-write workload.
//
// TTL STRATEGY (per endpoint type):
//   - Live scores:    5 minutes  (fast-changing)
//   - Standings:      1 hour     (change after matches)
//   - Player stats:   6 hours    (change after matches)
//   - Team info:      24 hours   (rarely changes)
//   - Fixtures list:  1 hour     (schedule is fairly static)
// ============================================

import axios from 'axios';
import ApiCache from '../models/ApiCache.js';
import { consumeQuota, checkQuota } from './rateLimiter.js';
import env from '../config/env.js';

// ── TTL constants (milliseconds) ─────────────────────────────
const TTL = {
  LIVE:         5 * 60 * 1000,        //  5 minutes
  STANDINGS:    60 * 60 * 1000,       //  1 hour
  FIXTURES:     60 * 60 * 1000,       //  1 hour
  PLAYER_STATS: 6 * 60 * 60 * 1000,  //  6 hours
  TEAM_INFO:    24 * 60 * 60 * 1000,  // 24 hours
  DEFAULT:      60 * 60 * 1000,       //  1 hour
};

// ── Axios instance with API-Football headers ─────────────────
const apiClient = axios.create({
  baseURL: env.apiFootballBaseUrl,
  timeout: 10000, // 10 second timeout
  headers: {
    'x-apisports-key': env.apiFootballKey,
  },
});

/**
 * Build a deterministic cache key from endpoint + params.
 * Sorts param keys to ensure { a:1, b:2 } and { b:2, a:1 }
 * produce the same key.
 *
 * @param {string} endpoint - API endpoint path (e.g., "/fixtures")
 * @param {object} params   - Query parameters
 * @returns {string} Cache key
 */
const buildCacheKey = (endpoint, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return `apifb:${endpoint}:${sortedParams}`;
};

/**
 * Determine the TTL for a given endpoint.
 *
 * @param {string} endpoint - API endpoint path
 * @returns {number} TTL in milliseconds
 */
const getTTL = (endpoint) => {
  if (endpoint.includes('fixtures') && endpoint.includes('live')) return TTL.LIVE;
  if (endpoint.includes('standings')) return TTL.STANDINGS;
  if (endpoint.includes('fixtures')) return TTL.FIXTURES;
  if (endpoint.includes('players')) return TTL.PLAYER_STATS;
  if (endpoint.includes('teams')) return TTL.TEAM_INFO;
  return TTL.DEFAULT;
};

/**
 * Make a rate-limited, cached request to API-Football.
 *
 * @param {string} endpoint  - API path (e.g., "/fixtures")
 * @param {object} [params]  - Query parameters
 * @param {object} [options] - Optional overrides
 * @param {number} [options.ttl] - Custom TTL in milliseconds
 * @param {boolean} [options.skipCache] - Force a fresh fetch (still respects quota)
 *
 * @returns {Promise<{
 *   data: object,
 *   fromCache: boolean,
 *   stale: boolean,
 *   quotaRemaining: number
 * }>}
 *
 * @throws {Error} With code 'QUOTA_EXHAUSTED' if no data available at all
 */
export const fetchFromApi = async (endpoint, params = {}, options = {}) => {
  const cacheKey = buildCacheKey(endpoint, params);
  const ttl = options.ttl || getTTL(endpoint);

  // ── Step 1: Check cache ──────────────────────────────────
  if (!options.skipCache) {
    const cached = await ApiCache.getCache(cacheKey);
    if (cached) {
      const quota = await checkQuota();
      return {
        data: cached,
        fromCache: true,
        stale: false,
        quotaRemaining: quota.remaining,
      };
    }
  }

  // ── Step 2: Attempt to consume quota ─────────────────────
  const quotaResult = await consumeQuota();

  if (!quotaResult.consumed) {
    // Quota exhausted — try stale cache as fallback
    const staleEntry = await ApiCache.getStaleCache(cacheKey);

    if (staleEntry) {
      console.warn(
        `⚠️  API quota exhausted (${quotaResult.count}/${env.apiFootballDailyLimit}). ` +
        `Serving stale cache for: ${cacheKey} (fetched: ${staleEntry.fetchedAt.toISOString()})`
      );
      return {
        data: staleEntry.data,
        fromCache: true,
        stale: true,
        quotaRemaining: 0,
      };
    }

    // No cache at all — throw a clear error
    const error = new Error(
      `API-Football daily quota exhausted (${quotaResult.count}/${env.apiFootballDailyLimit}). ` +
      `No cached data available for: ${endpoint}`
    );
    error.code = 'QUOTA_EXHAUSTED';
    error.statusCode = 429;
    throw error;
  }

  // ── Step 3: Make the actual API call ─────────────────────
  try {
    const response = await apiClient.get(endpoint, { params });

    // API-Football wraps responses in { get, parameters, errors, results, paging, response }
    const responseData = response.data;

    // Check for API-level errors
    if (responseData.errors && Object.keys(responseData.errors).length > 0) {
      console.error(`🔴  API-Football error for ${endpoint}:`, responseData.errors);
      const error = new Error(`API-Football returned errors: ${JSON.stringify(responseData.errors)}`);
      error.code = 'API_ERROR';
      error.statusCode = 502;
      throw error;
    }

    // ── Step 4: Cache the successful response ────────────────
    await ApiCache.setCache(cacheKey, endpoint, params, responseData, ttl);

    console.log(
      `✅  API-Football call #${quotaResult.count}: ${endpoint} ` +
      `(${quotaResult.remaining} remaining today)`
    );

    return {
      data: responseData,
      fromCache: false,
      stale: false,
      quotaRemaining: quotaResult.remaining,
    };
  } catch (err) {
    // If the HTTP call itself failed (network, timeout, 5xx)
    // try stale cache before bubbling up
    if (!err.code || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
      const staleEntry = await ApiCache.getStaleCache(cacheKey);
      if (staleEntry) {
        console.warn(
          `⚠️  API-Football call failed (${err.message}). Serving stale cache for: ${cacheKey}`
        );
        return {
          data: staleEntry.data,
          fromCache: true,
          stale: true,
          quotaRemaining: quotaResult.remaining,
        };
      }
    }

    throw err;
  }
};

/**
 * Convenience wrappers for common endpoints.
 * These provide type-safe, discoverable methods for the rest
 * of the codebase and enforce correct parameter names.
 */

/** Fetch a specific fixture by ID (match scorecard). */
export const getFixture = (fixtureId) =>
  fetchFromApi('/fixtures', { id: fixtureId });

/** Fetch live fixtures for a given league. */
export const getLiveFixtures = (leagueId) =>
  fetchFromApi('/fixtures', { live: 'all', league: leagueId }, { ttl: TTL.LIVE });

/** Fetch league standings. */
export const getStandings = (leagueId, season) =>
  fetchFromApi('/standings', { league: leagueId, season });

/** Fetch fixture events (goals, cards, subs). */
export const getFixtureEvents = (fixtureId) =>
  fetchFromApi('/fixtures/events', { fixture: fixtureId });

/** Fetch fixture lineups. */
export const getFixtureLineups = (fixtureId) =>
  fetchFromApi('/fixtures/lineups', { fixture: fixtureId });

/** Fetch fixture statistics. */
export const getFixtureStats = (fixtureId) =>
  fetchFromApi('/fixtures/statistics', { fixture: fixtureId });

/** Fetch player season statistics. */
export const getPlayerStats = (playerId, season) =>
  fetchFromApi('/players', { id: playerId, season });

/** Fetch team information. */
export const getTeamInfo = (teamId) =>
  fetchFromApi('/teams', { id: teamId });

/** Fetch squad (players) for a team. */
export const getSquad = (teamId) =>
  fetchFromApi('/players/squads', { team: teamId }, { ttl: TTL.TEAM_INFO });

/** Fetch player transfer history. */
export const getTransfers = (playerId) =>
  fetchFromApi('/transfers', { player: playerId }, { ttl: TTL.TEAM_INFO });

/** Fetch recent fixtures for a team in a given season. */
export const getTeamFixtures = (teamId, season, last = 10) =>
  fetchFromApi('/fixtures', { team: teamId, season, last }, { ttl: TTL.FIXTURES });

/** Fetch fixture player statistics (per-player match stats). */
export const getFixturePlayerStats = (fixtureId) =>
  fetchFromApi('/fixtures/players', { fixture: fixtureId });

export default {
  fetchFromApi,
  getFixture,
  getLiveFixtures,
  getStandings,
  getFixtureEvents,
  getFixtureLineups,
  getFixtureStats,
  getPlayerStats,
  getTeamInfo,
  getTeamFixtures,
  getSquad,
  getTransfers,
  getFixturePlayerStats,
};
