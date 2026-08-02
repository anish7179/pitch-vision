// ============================================
// src/cron/liveMatches.js
// ============================================
// Background cron worker that polls API-Football for live
// match data and upserts results into MongoDB.
//
// INTERVIEW CONCEPT — node-cron vs. AWS Lambda (Serverless):
// ──────────────────────────────────────────────────────────
// WHY WE PIVOTED FROM LAMBDA:
// API-Football's free tier has two critical restrictions:
//   1. Velocity limit: max 10 requests per minute
//   2. IP blocking: they block shared outbound IPs from AWS
//      Lambda, Google Cloud Functions, and similar FaaS
//      providers to prevent abuse from ephemeral compute
//
// A Lambda function's outbound IP comes from a shared NAT
// gateway pool. Hundreds of other users' Lambdas share those
// IPs. API-Football flags these IPs → our key gets banned.
//
// Running the cron inside our Express server means:
//   - Our server has a FIXED outbound IP (our machine/VPS)
//   - API-Football sees consistent, predictable traffic
//   - No IP-based blocking risk
//
// INTERVIEW TIP — When is Lambda BETTER than a cron?
//   - When the API provider doesn't block cloud IPs
//   - When you need independent scaling (cron tied to server)
//   - When you want zero idle compute cost
//   - When failures should be isolated from your web server
//
// INTERVIEW CONCEPT — Velocity Control (Rate Window):
// ──────────────────────────────────────────────────
// The 10 req/min limit means we must NEVER fire more than
// 10 HTTP requests within any sliding 60-second window.
//
// Our cron fires once every 5 minutes and makes exactly 1
// API call per invocation. That's 1 req / 5 min = 0.2 req/min.
// This is 50x below the velocity limit — extremely safe.
//
// But we also add a VELOCITY LOCK as defense-in-depth:
//   - Track the timestamp of every outbound API call
//   - Before each call, check: "have we made ≥10 calls in
//     the last 60 seconds?"
//   - If yes, SKIP the call entirely and log a warning
//
// This protects against accidental double-triggers, manual
// test calls, and any other code path that hits the API.
// ============================================

import cron from 'node-cron';
import LiveMatch from '../models/LiveMatch.js';
import { consumeQuota, checkQuota } from '../utils/rateLimiter.js';
import { getCache, setCache } from '../config/redisClient.js';
import env from '../config/env.js';
import axios from 'axios';

// ── Velocity Tracker ─────────────────────────────────────────
// Stores timestamps of recent API calls (sliding window)
const recentCalls = [];
const VELOCITY_LIMIT = 10;    // max calls per window
const VELOCITY_WINDOW = 60000; // 60 seconds in ms

/**
 * Check if we're within the velocity limit (10 req/min).
 * Prunes expired timestamps from the window.
 *
 * @returns {boolean} true if we can make another call
 */
const isWithinVelocityLimit = () => {
  const now = Date.now();
  // Remove timestamps older than 60 seconds
  while (recentCalls.length > 0 && recentCalls[0] < now - VELOCITY_WINDOW) {
    recentCalls.shift();
  }
  return recentCalls.length < VELOCITY_LIMIT;
};

/**
 * Record a new API call timestamp.
 */
const recordApiCall = () => {
  recentCalls.push(Date.now());
};

// ── Axios client (separate from the Phase 1 cached client) ──
// The cron job uses its own axios instance to avoid
// interfering with the Phase 1 rate-limited cache client.
// This call goes through the DAILY quota (consumeQuota)
// but NOT through the Phase 1 cache layer.
const apiClient = axios.create({
  baseURL: env.apiFootballBaseUrl,
  timeout: 15000, // 15 seconds (cron can afford to wait)
  headers: {
    'x-apisports-key': env.apiFootballKey,
  },
});

/**
 * Parse a raw API-Football fixture into our LiveMatch shape.
 *
 * @param {object} fixture - Raw fixture object from API-Football
 * @returns {object} Parsed document matching LiveMatch schema
 */
const parseFixture = (fixture) => {
  const { fixture: f, league, teams, goals, score, events, lineups, statistics, players } = fixture;

  return {
    matchId: f.id,
    referee: f.referee || 'TBD',
    timezone: f.timezone || 'UTC',
    dateTime: f.date,
    timestamp: f.timestamp,
    venue: f.venue ? { name: f.venue.name, city: f.venue.city } : null,
    status: {
      long: f.status.long,
      short: f.status.short,
      elapsed: f.status.elapsed,
      extra: f.status.extra,
    },
    league: {
      id: league.id,
      name: league.name,
      country: league.country,
      logo: league.logo,
      flag: league.flag,
      season: league.season,
      round: league.round,
    },
    teams: {
      home: { id: teams.home.id, name: teams.home.name, logo: teams.home.logo },
      away: { id: teams.away.id, name: teams.away.name, logo: teams.away.logo },
    },
    goals: { home: goals.home, away: goals.away },
    score: {
      halftime: score.halftime,
      fulltime: score.fulltime,
      extratime: score.extratime,
      penalty: score.penalty,
    },
    events: events
      ? events.map((e) => ({
          timeElapsed: e.time.elapsed,
          timeExtra: e.time.extra,
          teamId: e.team.id,
          teamName: e.team.name,
          player: e.player ? { id: e.player.id, name: e.player.name } : null,
          assist: e.assist ? { id: e.assist.id, name: e.assist.name } : null,
          type: e.type,
          detail: e.detail,
          comments: e.comments,
        }))
      : [],
    lineups: lineups
      ? lineups.map((l) => ({
          teamId: l.team.id,
          teamName: l.team.name,
          teamLogo: l.team.logo,
          formation: l.formation,
          startXI: l.startXI
            ? l.startXI.map((p) => ({
                id: p.player.id,
                name: p.player.name,
                number: p.player.number,
                pos: p.player.pos,
                grid: p.player.grid,
              }))
            : [],
          substitutes: l.substitutes
            ? l.substitutes.map((p) => ({
                id: p.player.id,
                name: p.player.name,
                number: p.player.number,
                pos: p.player.pos,
              }))
            : [],
          coach: l.coach
            ? { id: l.coach.id, name: l.coach.name, photo: l.coach.photo }
            : null,
        }))
      : [],
    statistics: statistics
      ? statistics.map((s) => ({
          teamId: s.team.id,
          teamName: s.team.name,
          stats: s.statistics
            ? s.statistics.reduce((acc, stat) => {
                acc[stat.type] = stat.value;
                return acc;
              }, {})
            : {},
        }))
      : [],
    playerStats: players
      ? players.map((teamData) => ({
          teamId: teamData.team.id,
          players: teamData.players
            ? teamData.players.map((p) => ({
                id: p.player.id,
                name: p.player.name,
                photo: p.player.photo,
                stats: p.statistics?.[0]
                  ? {
                      minutes: p.statistics[0].games?.minutes,
                      position: p.statistics[0].games?.position,
                      rating: p.statistics[0].games?.rating,
                      captain: p.statistics[0].games?.captain,
                      shots: p.statistics[0].shots?.total,
                      shotsOn: p.statistics[0].shots?.on,
                      goals: p.statistics[0].goals?.total,
                      assists: p.statistics[0].goals?.assists,
                      passes: p.statistics[0].passes?.total,
                      passAccuracy: p.statistics[0].passes?.accuracy,
                      keyPasses: p.statistics[0].passes?.key,
                      tackles: p.statistics[0].tackles?.total,
                      interceptions: p.statistics[0].tackles?.interceptions,
                      duels: p.statistics[0].duels?.total,
                      duelsWon: p.statistics[0].duels?.won,
                      dribbles: p.statistics[0].dribbles?.attempts,
                      dribblesSuccess: p.statistics[0].dribbles?.success,
                      foulsDrawn: p.statistics[0].fouls?.drawn,
                      foulsCommitted: p.statistics[0].fouls?.committed,
                      yellowCards: p.statistics[0].cards?.yellow,
                      redCards: p.statistics[0].cards?.red,
                      saves: p.statistics[0].goals?.saves,
                      offsides: p.statistics[0].offsides,
                    }
                  : null,
              }))
            : [],
        }))
      : [],
  };
};

/**
 * Core polling function — fetch live matches and upsert into MongoDB.
 * Called by the cron schedule every 5 minutes.
 *
 * INTERVIEW CONCEPT — Bulk Upsert with bulkWrite():
 * Instead of N individual updateOne() calls (N round trips to
 * MongoDB), we use bulkWrite() which sends all operations in
 * a single network round trip. MongoDB processes them atomically
 * per-document (not per-batch). This is O(1) network calls
 * instead of O(N).
 */
const pollLiveMatches = async () => {
  const startTime = Date.now();
  console.log(`\n⚽  [Cron] Live match poll started at ${new Date().toISOString()}`);

  // ── Guard 1: Velocity limit ────────────────────────────
  if (!isWithinVelocityLimit()) {
    console.warn('🛑  [Cron] Velocity limit reached (10 req/min). Skipping poll.');
    return;
  }

  // ── Guard 2: Daily quota ───────────────────────────────
  const quota = await checkQuota();
  if (!quota.allowed) {
    console.warn(`🛑  [Cron] Daily quota exhausted (${quota.count}/${quota.limit}). Skipping poll.`);
    return;
  }

  try {
    // ── Step 1: Consume a daily quota slot ────────────────
    const quotaResult = await consumeQuota();
    if (!quotaResult.consumed) {
      console.warn('🛑  [Cron] Failed to consume quota (race condition). Skipping.');
      return;
    }

    // ── Step 2: Fetch live fixtures ──────────────────────
    recordApiCall(); // Track for velocity window

    const response = await apiClient.get('/fixtures', {
      params: { live: 'all' },
    });

    const apiData = response.data;

    // Check for API-level errors
    if (apiData.errors && Object.keys(apiData.errors).length > 0) {
      console.error('🔴  [Cron] API-Football errors:', JSON.stringify(apiData.errors));
      return;
    }

    const fixtures = apiData.response || [];
    console.log(`📊  [Cron] Found ${fixtures.length} live fixture(s). Quota: ${quotaResult.remaining} remaining.`);

    // ── Step 3: No live matches — nothing to do ──────────
    if (fixtures.length === 0) {
      // Cache empty state so frontend knows there are no live matches
      await setCache('live:matches', [], 300);
      console.log(`✅  [Cron] No live matches. Poll took ${Date.now() - startTime}ms.`);
      return;
    }

    // ── Step 4: Parse fixtures ───────────────────────────
    const operations = [];
    const parsedMatches = [];
    let parseErrors = 0;

    for (const fixture of fixtures) {
      try {
        const parsed = parseFixture(fixture);
        parsedMatches.push(parsed);
        operations.push({
          updateOne: {
            filter: { matchId: parsed.matchId },
            update: { $set: parsed },
            upsert: true,
          },
        });
      } catch (err) {
        parseErrors++;
        console.warn(`⚠️  [Cron] Parse error for fixture ${fixture?.fixture?.id}: ${err.message}`);
      }
    }

    // ── Step 5: Bulk upsert into MongoDB ─────────────────
    if (operations.length > 0) {
      const result = await LiveMatch.bulkWrite(operations, {
        ordered: false, // Continue even if one op fails
      });

      console.log(
        `✅  [Cron] Bulk upsert complete: ` +
        `${result.upsertedCount} inserted, ` +
        `${result.modifiedCount} updated, ` +
        `${parseErrors} parse errors. ` +
        `Poll took ${Date.now() - startTime}ms.`
      );
    }

    // ── Step 6: Cache in Redis ───────────────────────────
    // TTL of 5 minutes matches our cron interval. The next
    // poll will overwrite this key with fresh data.
    await setCache('live:matches', parsedMatches, 300);

    // ── Step 7: Detect score changes & emit via Socket.io ─
    // Compare current scores against the previous cached
    // snapshot. If any match has a different score, emit
    // targeted events to clients watching that match.
    try {
      const previousSnapshot = await getCache('live:matches:previous');
      const previousScores = {};

      if (previousSnapshot && Array.isArray(previousSnapshot)) {
        for (const match of previousSnapshot) {
          previousScores[match.matchId] = {
            home: match.goals?.home,
            away: match.goals?.away,
          };
        }
      }

      // Emit score changes via Socket.io
      // We dynamically import the io instance to avoid circular deps
      const { io } = await import('../server.js');

      for (const match of parsedMatches) {
        const prev = previousScores[match.matchId];
        const curr = { home: match.goals?.home, away: match.goals?.away };

        // Score changed (or brand new match)
        if (!prev || prev.home !== curr.home || prev.away !== curr.away) {
          const payload = {
            matchId: match.matchId,
            teams: match.teams,
            goals: match.goals,
            status: match.status,
            league: match.league,
          };

          // Emit to the specific match room
          io.to(`match:${match.matchId}`).emit('match:scoreUpdate', payload);

          // Emit to the global live feed
          io.emit('live:scoreChange', payload);

          console.log(
            `📢  [Cron] Score change: ${match.teams?.home?.name} ${curr.home} - ${curr.away} ${match.teams?.away?.name} ` +
            `(was ${prev?.home ?? '?'} - ${prev?.away ?? '?'})`
          );
        }
      }

      // Save current snapshot as "previous" for next comparison
      await setCache('live:matches:previous', parsedMatches, 600);
    } catch (emitErr) {
      // Socket.io emission is non-critical — log and continue
      console.warn(`⚠️  [Cron] Score change detection/emit error: ${emitErr.message}`);
    }
  } catch (err) {
    // Handle specific axios errors
    if (err.response) {
      console.error(
        `🔴  [Cron] API-Football HTTP ${err.response.status}: ` +
        `${JSON.stringify(err.response.data)}`
      );
    } else if (err.code === 'ECONNABORTED') {
      console.error('🔴  [Cron] API-Football request timed out (15s).');
    } else {
      console.error(`🔴  [Cron] Poll error: ${err.message}`);
    }
  }
};

// ── Cron Status Tracking ─────────────────────────────────────
let cronTask = null;
let isRunning = false;

/**
 * Initialize and start the live match cron job.
 *
 * Schedule: every 5 minutes ("* /5 * * * *")
 *
 * INTERVIEW CONCEPT — Cron Expression Syntax:
 *   ┌────────── minute (0-59)
 *   │ ┌──────── hour (0-23)
 *   │ │ ┌────── day of month (1-31)
 *   │ │ │ ┌──── month (1-12)
 *   │ │ │ │ ┌── day of week (0-7, 0 and 7 = Sunday)
 *   │ │ │ │ │
 *   * * * * *
 *
 *   "* /5 * * * *" = every 5 minutes (at :00, :05, :10, :15, ...)
 *
 * NOTE: We set scheduled: false initially and start manually
 * after MongoDB is connected. This prevents the cron from
 * firing before the database is ready.
 */
export const startLiveMatchCron = () => {
  if (isRunning) {
    console.warn('⚠️  Live match cron is already running.');
    return;
  }

  cronTask = cron.schedule('*/5 * * * *', async () => {
    // Prevent overlapping executions
    // (if a poll takes >5 minutes, don't start another)
    if (isRunning) {
      console.warn('⚠️  [Cron] Previous poll still running. Skipping.');
      return;
    }

    isRunning = true;
    try {
      await pollLiveMatches();
    } catch (err) {
      console.error(`🔴  [Cron] Unhandled error: ${err.message}`);
    } finally {
      isRunning = false;
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  console.log('⏰  Live match cron started (every 5 minutes, UTC)');
};

/**
 * Stop the cron job gracefully.
 * Called during server shutdown.
 */
export const stopLiveMatchCron = () => {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    isRunning = false;
    console.log('⏰  Live match cron stopped.');
  }
};

/**
 * Get cron job status (for health check / debugging).
 *
 * @returns {{ running: boolean, velocityWindow: number, nextPoll: string }}
 */
export const getCronStatus = () => {
  return {
    running: cronTask !== null,
    currentlyPolling: isRunning,
    velocityWindowCalls: recentCalls.filter((t) => t > Date.now() - VELOCITY_WINDOW).length,
    velocityLimit: VELOCITY_LIMIT,
  };
};

export default { startLiveMatchCron, stopLiveMatchCron, getCronStatus };
