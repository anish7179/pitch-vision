// ============================================
// src/routes/football.routes.js
// ============================================
// Proxy routes for API-Football data.
// These wrap the rate-limited apiFootball client, ensuring
// the frontend never calls API-Football directly.
//
// In Phase 1, we include a basic status/quota check endpoint
// and stub routes that will be expanded in Phase 2 (Scorecard)
// and Phase 3 (Profiles).
//
// INTERVIEW CONCEPT — Backend-for-Frontend (BFF) Pattern:
// The React frontend calls OUR Express server, not API-Football
// directly. This gives us:
//   1. Rate limiting (one place to enforce the quota)
//   2. Caching (one cache layer, not per-client)
//   3. Data transformation (reshape API responses for our UI)
//   4. Security (API key stays on the server, never sent to browser)
// ============================================

import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import apiFootball from '../utils/apiFootball.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// All football data routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/football/fixtures
 * @desc    Get fixtures for a given date or league
 * @access  Protected
 *
 * Query params:
 *   - date (YYYY-MM-DD)
 *   - league (league ID)
 *   - season (year)
 */
router.get('/fixtures', async (req, res, next) => {
  try {
    const { date, league, season, team, last, next: nextCount } = req.query;
    const params = {};

    if (date) params.date = date;
    if (league) params.league = league;
    if (season) params.season = season;
    if (team) params.team = team;
    if (last) params.last = last;
    if (nextCount) params.next = nextCount;

    // At least one parameter is required
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
});

/**
 * @route   GET /api/football/fixtures/:id
 * @desc    Get a single fixture by ID (full scorecard data)
 * @access  Protected
 */
router.get('/fixtures/:id', async (req, res, next) => {
  try {
    const fixtureId = parseInt(req.params.id, 10);
    if (isNaN(fixtureId)) {
      throw new AppError('Invalid fixture ID. Must be a number.', 400);
    }

    const result = await apiFootball.getFixture(fixtureId);

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
});

/**
 * @route   GET /api/football/standings
 * @desc    Get league standings
 * @access  Protected
 *
 * Query params:
 *   - league (required, league ID)
 *   - season (required, year)
 */
router.get('/standings', async (req, res, next) => {
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
});

/**
 * @route   GET /api/football/teams/:id
 * @desc    Get team information
 * @access  Protected
 */
router.get('/teams/:id', async (req, res, next) => {
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
});

/**
 * @route   GET /api/football/players/:id
 * @desc    Get player season statistics
 * @access  Protected
 *
 * Query params:
 *   - season (required, year)
 */
router.get('/players/:id', async (req, res, next) => {
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
});

/**
 * @route   GET /api/football/squads/:teamId
 * @desc    Get squad list for a team
 * @access  Protected
 */
router.get('/squads/:teamId', async (req, res, next) => {
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
});

/**
 * @route   GET /api/football/transfers/:playerId
 * @desc    Get player transfer history
 * @access  Protected
 */
router.get('/transfers/:playerId', async (req, res, next) => {
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
});

export default router;
