// ============================================
// src/routes/football.routes.js
// ============================================
// Football data routes — all routed through controllers.
//
// PHASE 2 ARCHITECTURE:
//   /live and /scorecard routes read from MongoDB (cron-populated)
//   All other routes proxy through the Phase 1 API-Football cache
//
// Route map:
//   GET /api/football/live                   → All live matches (MongoDB)
//   GET /api/football/scorecard/:id          → Full scorecard (MongoDB or API cache)
//   GET /api/football/scorecard/:id/events   → Match events timeline
//   GET /api/football/scorecard/:id/lineups  → Match lineups
//   GET /api/football/scorecard/:id/stats    → Match statistics
//   GET /api/football/fixtures               → Fixtures by date/league/team
//   GET /api/football/standings              → League standings
//   GET /api/football/teams/:id              → Team info
//   GET /api/football/players/:id            → Player season stats
//   GET /api/football/squads/:teamId         → Squad list
//   GET /api/football/transfers/:playerId    → Transfer history
//
// INTERVIEW CONCEPT — Route Ordering:
// Express matches routes top-down, stopping at the first
// match. More specific routes MUST come before less specific:
//   /scorecard/:id/events  ← BEFORE /scorecard/:id
//   /scorecard/:id         ← would swallow "/events" as :id
// ============================================

import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import {
  getLiveMatches,
  getScorecard,
  getFixtureEvents,
  getFixtureLineups,
  getFixtureStats,
  getFixtures,
  getStandings,
  getTeamInfo,
  getPlayerStats,
  getSquad,
  getTransfers,
  getCompetitions,
  getMatchesByCompetition,
  getPlayerHistory,
} from '../controllers/football.controller.js';

const router = Router();

// ── Competitions Index ───────────────────────────────────────
router.get('/competitions', getCompetitions);

// ── Matches by Competition & Season ──────────────────────────
router.get('/matches/:comp_id/:season_id', getMatchesByCompetition);

// All football data routes are public for the main UI
// (If user-specific features are added later, add authenticate per-route)
// router.use(authenticate);

// ── Live Matches (from MongoDB cron cache) ───────────────────
router.get('/live', getLiveMatches);

// ── Scorecard (MongoDB for live, API-Football cache for others)
// Sub-routes MUST come before the parent route
router.get('/scorecard/:id/events', getFixtureEvents);
router.get('/scorecard/:id/lineups', getFixtureLineups);
router.get('/scorecard/:id/stats', getFixtureStats);
router.get('/scorecard/:id', getScorecard);

// ── Fixtures (API-Football cache) ────────────────────────────
router.get('/fixtures', getFixtures);

// ── Standings ────────────────────────────────────────────────
router.get('/standings', getStandings);

// ── Teams ────────────────────────────────────────────────────
router.get('/teams/:id', getTeamInfo);

// ── Players ──────────────────────────────────────────────────
router.get('/players/:id', getPlayerStats);
router.get('/player/:player_id/history', getPlayerHistory);

// ── Squads ───────────────────────────────────────────────────
router.get('/squads/:teamId', getSquad);

// ── Transfers ────────────────────────────────────────────────
router.get('/transfers/:playerId', getTransfers);

export default router;
