// ============================================
// src/controllers/football.controller.js
// ============================================
// Controllers for live match data and comprehensive scorecards.
//
// INTERVIEW CONCEPT — Controller Pattern (MVC):
// Controllers contain business logic. They sit between
// routes (URL patterns) and models (data access).
//
//   Route → Controller → Model/Service → Database
//
// Each controller function is a single responsibility:
//   - Validate input (throw 400 if bad)
//   - Fetch data (from MongoDB or API-Football cache)
//   - Transform response (reshape for frontend)
//   - Handle errors (pass to global error handler)
//
// DATA SOURCE STRATEGY:
//   ┌─────────────┐     ┌───────────────────────────┐
//   │ Is the match │ YES │ Read from MongoDB          │
//   │ currently    ├────►│ (LiveMatch collection,     │
//   │ live?        │     │  populated by cron worker) │
//   └──────┬──────┘     │ ZERO API cost              │
//          │ NO         └───────────────────────────┘
//          ▼
//   ┌─────────────────────────────────┐
//   │ Read from API-Football cache    │
//   │ (Phase 1 rate-limited client)   │
//   │ Aggregates fixture + events +   │
//   │ lineups + stats into one call   │
//   └─────────────────────────────────┘
// ============================================

import LiveMatch from '../models/LiveMatch.js';
import apiFootball from '../utils/apiFootball.js';
import { AppError } from '../middleware/errorHandler.js';
import { getCronStatus } from '../cron/liveMatches.js';

// Live match status codes from API-Football
const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'INT']);

/**
 * Get all currently live matches from MongoDB.
 * Returns the cron-populated cache — ZERO API-Football cost.
 *
 * @route GET /api/football/live
 * @access Protected
 */
export const getLiveMatches = async (req, res, next) => {
  try {
    const matches = await LiveMatch.find({})
      .sort({ 'league.name': 1, timestamp: 1 })
      .lean();

    const cronStatus = getCronStatus();

    res.status(200).json({
      success: true,
      data: {
        count: matches.length,
        matches,
      },
      meta: {
        source: 'mongodb-live-cache',
        cronStatus,
        description: 'Live matches from background cron poller',
      },
    });
  } catch (err) {
    console.error('🔴  getLiveMatches error:', err.message);
    next(new AppError(`Failed to fetch live matches: ${err.message}`, 502));
  }
};

/**
 * Get a comprehensive match scorecard.
 *
 * For LIVE matches: reads from MongoDB LiveMatch collection
 * (populated by the cron worker — zero API cost).
 *
 * For NON-LIVE matches (finished, scheduled): aggregates from
 * multiple API-Football endpoints via the Phase 1 cache client:
 *   - /fixtures         → match info + score
 *   - /fixtures/events  → timeline (goals, cards, subs)
 *   - /fixtures/lineups → starting XI + substitutes
 *   - /fixtures/statistics → possession, shots, etc.
 *   - /fixtures/players → per-player match stats
 *
 * INTERVIEW CONCEPT — Promise.allSettled:
 * Unlike Promise.all (which rejects on first failure),
 * allSettled ALWAYS resolves with an array of results.
 * Each result is either { status: 'fulfilled', value }
 * or { status: 'rejected', reason }.
 *
 * This is critical here because lineups might not be
 * available pre-match, or stats might fail — but we still
 * want to return the match info and whatever data we have.
 * Partial data is better than no data.
 *
 * @route GET /api/football/scorecard/:id
 * @access Protected
 */
export const getScorecard = async (req, res, next) => {
  try {
    const fixtureId = parseInt(req.params.id, 10);
    if (isNaN(fixtureId)) {
      throw new AppError('Invalid fixture ID. Must be a number.', 400);
    }

    // ── Step 1: Check MongoDB for live data ────────────────
    const liveMatch = await LiveMatch.findOne({ matchId: fixtureId }).lean();

    if (liveMatch && LIVE_STATUSES.has(liveMatch.status?.short)) {
      return res.status(200).json({
        success: true,
        data: {
          scorecard: liveMatch,
          isLive: true,
        },
        meta: {
          source: 'mongodb-live-cache',
          lastUpdated: liveMatch.updatedAt,
        },
      });
    }

    // ── Step 2: Non-live — aggregate from API-Football ─────
    const [
      fixtureResult,
      eventsResult,
      lineupsResult,
      statsResult,
      playerStatsResult,
    ] = await Promise.allSettled([
      apiFootball.getFixture(fixtureId),
      apiFootball.getFixtureEvents(fixtureId),
      apiFootball.getFixtureLineups(fixtureId),
      apiFootball.getFixtureStats(fixtureId),
      apiFootball.getFixturePlayerStats(fixtureId),
    ]);

    // Fixture data is required — others are optional
    if (fixtureResult.status === 'rejected') {
      throw fixtureResult.reason;
    }

    const fixtureData = fixtureResult.value.data;
    const fixture = fixtureData.response?.[0];

    if (!fixture) {
      throw new AppError(`Fixture ${fixtureId} not found.`, 404);
    }

    // Build the unified scorecard
    const scorecard = {
      matchId: fixture.fixture.id,
      referee: fixture.fixture.referee,
      dateTime: fixture.fixture.date,
      timestamp: fixture.fixture.timestamp,
      venue: fixture.fixture.venue,
      status: fixture.fixture.status,
      league: fixture.league,
      teams: fixture.teams,
      goals: fixture.goals,
      score: fixture.score,
      events:
        eventsResult.status === 'fulfilled'
          ? eventsResult.value.data.response || []
          : [],
      lineups:
        lineupsResult.status === 'fulfilled'
          ? lineupsResult.value.data.response || []
          : [],
      statistics:
        statsResult.status === 'fulfilled'
          ? statsResult.value.data.response || []
          : [],
      playerStats:
        playerStatsResult.status === 'fulfilled'
          ? playerStatsResult.value.data.response || []
          : [],
      lastUpdated: new Date().toISOString(),
    };

    const dataAvailability = {
      fixture: true,
      events: eventsResult.status === 'fulfilled',
      lineups: lineupsResult.status === 'fulfilled',
      statistics: statsResult.status === 'fulfilled',
      playerStats: playerStatsResult.status === 'fulfilled',
    };

    const quotaRemaining = fixtureResult.value.quotaRemaining;

    res.status(200).json({
      success: true,
      data: {
        scorecard,
        isLive: false,
      },
      meta: {
        source: 'api-football-cache',
        dataAvailability,
        quotaRemaining,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get fixture events timeline (goals, cards, subs).
 *
 * @route GET /api/football/scorecard/:id/events
 * @access Protected
 */
export const getFixtureEvents = async (req, res, next) => {
  try {
    const fixtureId = parseInt(req.params.id, 10);
    if (isNaN(fixtureId)) {
      throw new AppError('Invalid fixture ID. Must be a number.', 400);
    }

    // Check MongoDB for live data first
    const liveMatch = await LiveMatch.findOne({ matchId: fixtureId }).lean();
    if (liveMatch && LIVE_STATUSES.has(liveMatch.status?.short)) {
      return res.status(200).json({
        success: true,
        data: { events: liveMatch.events || [] },
        meta: { source: 'mongodb-live-cache', isLive: true },
      });
    }

    // Fall back to API-Football cache
    const result = await apiFootball.getFixtureEvents(fixtureId);

    res.status(200).json({
      success: true,
      data: { events: result.data.response || [] },
      meta: {
        source: 'api-football-cache',
        fromCache: result.fromCache,
        quotaRemaining: result.quotaRemaining,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get fixture lineups (starting XI + substitutes).
 *
 * @route GET /api/football/scorecard/:id/lineups
 * @access Protected
 */
export const getFixtureLineups = async (req, res, next) => {
  try {
    const fixtureId = parseInt(req.params.id, 10);
    if (isNaN(fixtureId)) {
      throw new AppError('Invalid fixture ID. Must be a number.', 400);
    }

    const liveMatch = await LiveMatch.findOne({ matchId: fixtureId }).lean();
    if (liveMatch && LIVE_STATUSES.has(liveMatch.status?.short)) {
      return res.status(200).json({
        success: true,
        data: { lineups: liveMatch.lineups || [] },
        meta: { source: 'mongodb-live-cache', isLive: true },
      });
    }

    const result = await apiFootball.getFixtureLineups(fixtureId);

    res.status(200).json({
      success: true,
      data: { lineups: result.data.response || [] },
      meta: {
        source: 'api-football-cache',
        fromCache: result.fromCache,
        quotaRemaining: result.quotaRemaining,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get fixture match statistics (possession, shots, passes, etc.).
 *
 * @route GET /api/football/scorecard/:id/stats
 * @access Protected
 */
export const getFixtureStats = async (req, res, next) => {
  try {
    const fixtureId = parseInt(req.params.id, 10);
    if (isNaN(fixtureId)) {
      throw new AppError('Invalid fixture ID. Must be a number.', 400);
    }

    const liveMatch = await LiveMatch.findOne({ matchId: fixtureId }).lean();
    if (liveMatch && LIVE_STATUSES.has(liveMatch.status?.short)) {
      return res.status(200).json({
        success: true,
        data: { statistics: liveMatch.statistics || [] },
        meta: { source: 'mongodb-live-cache', isLive: true },
      });
    }

    const result = await apiFootball.getFixtureStats(fixtureId);

    res.status(200).json({
      success: true,
      data: { statistics: result.data.response || [] },
      meta: {
        source: 'api-football-cache',
        fromCache: result.fromCache,
        quotaRemaining: result.quotaRemaining,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get fixtures for a given date, league, or team.
 *
 * @route GET /api/football/fixtures
 * @access Protected
 */
export const getFixtures = async (req, res, next) => {
  try {
    const { date, league, season, team, last, next: nextCount } = req.query;
    const params = {};

    if (date) params.date = date;
    if (league) params.league = league;
    if (season) params.season = season;
    if (team) params.team = team;
    if (last) params.last = last;
    if (nextCount) params.next = nextCount;

    if (Object.keys(params).length === 0) {
      throw new AppError(
        'At least one query parameter is required: date, league, season, team, last, or next',
        400
      );
    }

    const result = await apiFootball.fetchFromApi('/fixtures', params);

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        fromCache: result.fromCache,
        stale: result.stale,
        quotaRemaining: result.quotaRemaining,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get league standings.
 *
 * @route GET /api/football/standings
 * @access Protected
 */
export const getStandings = async (req, res, next) => {
  try {
    const { league, season } = req.query;
    if (!league || !season) {
      throw new AppError('Both league and season query parameters are required.', 400);
    }

    const result = await apiFootball.getStandings(league, season);

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        fromCache: result.fromCache,
        stale: result.stale,
        quotaRemaining: result.quotaRemaining,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get team information.
 *
 * @route GET /api/football/teams/:id
 * @access Protected
 */
export const getTeamInfo = async (req, res, next) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
      throw new AppError('Invalid team ID. Must be a number.', 400);
    }

    const result = await apiFootball.getTeamInfo(teamId);

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        fromCache: result.fromCache,
        stale: result.stale,
        quotaRemaining: result.quotaRemaining,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get player season statistics.
 *
 * @route GET /api/football/players/:id?season=YYYY
 * @access Protected
 */
export const getPlayerStats = async (req, res, next) => {
  try {
    const playerId = parseInt(req.params.id, 10);
    if (isNaN(playerId)) {
      throw new AppError('Invalid player ID. Must be a number.', 400);
    }

    const season = req.query.season;
    if (!season) {
      throw new AppError('Season query parameter is required.', 400);
    }

    const result = await apiFootball.getPlayerStats(playerId, season);

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        fromCache: result.fromCache,
        stale: result.stale,
        quotaRemaining: result.quotaRemaining,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get squad list for a team.
 *
 * @route GET /api/football/squads/:teamId
 * @access Protected
 */
export const getSquad = async (req, res, next) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    if (isNaN(teamId)) {
      throw new AppError('Invalid team ID. Must be a number.', 400);
    }

    const result = await apiFootball.getSquad(teamId);

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        fromCache: result.fromCache,
        stale: result.stale,
        quotaRemaining: result.quotaRemaining,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get player transfer history.
 *
 * @route GET /api/football/transfers/:playerId
 * @access Protected
 */
export const getTransfers = async (req, res, next) => {
  try {
    const playerId = parseInt(req.params.playerId, 10);
    if (isNaN(playerId)) {
      throw new AppError('Invalid player ID. Must be a number.', 400);
    }

    const result = await apiFootball.getTransfers(playerId);

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        fromCache: result.fromCache,
        stale: result.stale,
        quotaRemaining: result.quotaRemaining,
      },
    });
  } catch (err) {
    next(err);
  }
};
