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
import HistoricalTeam from '../models/HistoricalTeam.js';
import HistoricalPlayer from '../models/HistoricalPlayer.js';
import apiFootball from '../utils/apiFootball.js';
import { AppError } from '../middleware/errorHandler.js';
import { getCronStatus } from '../cron/liveMatches.js';
import { getCache } from '../config/redisClient.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COMPETITIONS_FILE = path.join(__dirname, '..', '..', 'data', 'open-data', 'open-data-master', 'data', 'competitions.json');

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
    const cronStatus = getCronStatus();

    // ── Check Redis Cache First ────────────────────────────────
    const cachedMatches = await getCache('live:matches');
    if (cachedMatches) {
      return res.status(200).json({
        success: true,
        data: {
          count: cachedMatches.length,
          matches: cachedMatches,
        },
        meta: {
          source: 'redis-cache',
          cronStatus,
          description: 'Live matches served directly from Redis in-memory cache',
        },
      });
    }

    // ── Fallback to MongoDB if Redis is down/empty ────────────
    const matches = await LiveMatch.find({})
      .sort({ 'league.name': 1, timestamp: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        count: matches.length,
        matches,
      },
      meta: {
        source: 'mongodb-fallback',
        cronStatus,
        description: 'Live matches from MongoDB fallback',
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

    // ── Step 1a: Check Redis Cache for live data ───────────
    const cachedLiveMatches = await getCache('live:matches');
    if (cachedLiveMatches && Array.isArray(cachedLiveMatches)) {
      const matchInCache = cachedLiveMatches.find(m => m.matchId === fixtureId);
      if (matchInCache && LIVE_STATUSES.has(matchInCache.status?.short)) {
        return res.status(200).json({
          success: true,
          data: {
            scorecard: matchInCache,
            isLive: true,
          },
          meta: {
            source: 'redis-cache',
          },
        });
      }
    }

    // ── Step 1b: Check MongoDB for live data (fallback) ─────
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
 * Get comprehensive team profile data.
 *
 * Without ?season: returns team info + current squad.
 * With ?season=YYYY: aggregates team info + squad + standings + recent fixtures.
 *
 * INTERVIEW CONCEPT — Promise.allSettled for Partial Data:
 * When fetching a team profile, we want team info, squad, standings,
 * and recent fixtures. Some of these may fail (e.g., no standings
 * available for that season yet). Promise.allSettled lets us return
 * whatever data we successfully retrieved rather than failing entirely.
 *
 * @route GET /api/football/teams/:id?season=YYYY
 * @access Protected
 */
export const getTeamInfo = async (req, res, next) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
      throw new AppError('Invalid team ID. Must be a number.', 400);
    }

    const season = req.query.season || new Date().getFullYear();
    const seasonInt = parseInt(season, 10);

    // DB-First Historical Data Architecture
    if (seasonInt < 2026) {
      const historicalData = await HistoricalTeam.findOne({ teamId, season: seasonInt });
      if (historicalData) {
        return res.status(200).json({
          success: true,
          data: {
            team: historicalData.teamInfo,
            squad: historicalData.squad?.[0]?.players || historicalData.squad, // Format appropriately depending on saved structure
            standings: historicalData.standings,
            recentFixtures: historicalData.recentFixtures,
            season: seasonInt,
          },
          meta: {
            source: 'mongodb-historical',
            dataAvailability: { team: true, squad: true, standings: true, fixtures: true },
            quotaRemaining: 'N/A (Historical)',
          },
        });
      }
      // If historical data not found in DB, could either throw error or fallback. We'll fallback to API for safety.
    }

    // Always fetch team info and squad
    const [teamResult, squadResult, standingsResult, fixturesResult] =
      await Promise.allSettled([
        apiFootball.getTeamInfo(teamId),
        apiFootball.getSquad(teamId),
        apiFootball.getStandings(null, season),
        apiFootball.getTeamFixtures(teamId, season, 10),
      ]);

    // Team info is required — others are optional
    if (teamResult.status === 'rejected') {
      throw teamResult.reason;
    }

    const teamData = teamResult.value.data?.response?.[0] || null;

    // Extract squad data
    const squadData =
      squadResult.status === 'fulfilled'
        ? squadResult.value.data?.response?.[0]?.players || []
        : [];

    // Extract league standings for this team
    let standingsData = [];
    if (standingsResult.status === 'fulfilled') {
      const allStandings = standingsResult.value.data?.response || [];
      // Filter standings to only include leagues this team is in
      standingsData = allStandings
        .map((leagueEntry) => {
          const league = leagueEntry.league;
          if (!league?.standings) return null;
          // standings is an array of groups, flatten and find team
          const flatStandings = league.standings.flat();
          const teamStanding = flatStandings.find(
            (s) => s.team?.id === teamId
          );
          if (!teamStanding) return null;
          return {
            league: {
              id: league.id,
              name: league.name,
              logo: league.logo,
              country: league.country,
              season: league.season,
            },
            standing: teamStanding,
          };
        })
        .filter(Boolean);
    }

    // Extract recent fixtures
    const fixturesData =
      fixturesResult.status === 'fulfilled'
        ? fixturesResult.value.data?.response || []
        : [];

    const dataAvailability = {
      team: teamResult.status === 'fulfilled',
      squad: squadResult.status === 'fulfilled',
      standings: standingsResult.status === 'fulfilled',
      fixtures: fixturesResult.status === 'fulfilled',
    };

    const quotaRemaining = teamResult.value.quotaRemaining;

    res.status(200).json({
      success: true,
      data: {
        team: teamData,
        squad: squadData,
        standings: standingsData,
        recentFixtures: fixturesData,
        season: parseInt(season, 10),
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
 * Get comprehensive player profile data.
 *
 * Aggregates player season statistics + transfer history
 * into a single unified response.
 *
 * Season is now OPTIONAL — defaults to current year.
 *
 * INTERVIEW CONCEPT — Default Parameters & Graceful Degradation:
 * By making season optional and providing a sensible default,
 * we reduce friction for the frontend. The caller can simply
 * navigate to /players/123 and get current-season data without
 * needing to know what year it is. Historical data is one
 * query param away: /players/123?season=2022.
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

    // Season is optional — default to current year
    const season = req.query.season || new Date().getFullYear();
    const seasonInt = parseInt(season, 10);

    // DB-First Historical Data Architecture
    if (seasonInt < 2026) {
      const historicalData = await HistoricalPlayer.findOne({ playerId, season: seasonInt });
      if (historicalData) {
        return res.status(200).json({
          success: true,
          data: {
            player: historicalData.playerProfile,
            statistics: historicalData.statistics,
            transfers: historicalData.transfers,
            season: seasonInt,
          },
          meta: {
            source: 'mongodb-historical',
            dataAvailability: { stats: true, transfers: true },
            quotaRemaining: 'N/A (Historical)',
          },
        });
      }
    }

    const [statsResult, transfersResult] = await Promise.allSettled([
      apiFootball.getPlayerStats(playerId, season),
      apiFootball.getTransfers(playerId),
    ]);

    // Player stats is the primary data — required
    if (statsResult.status === 'rejected') {
      throw statsResult.reason;
    }

    const playerData = statsResult.value.data?.response?.[0] || null;

    // Extract transfer history (optional)
    const transfersData =
      transfersResult.status === 'fulfilled'
        ? transfersResult.value.data?.response?.[0]?.transfers || []
        : [];

    const dataAvailability = {
      stats: statsResult.status === 'fulfilled',
      transfers: transfersResult.status === 'fulfilled',
    };

    const quotaRemaining = statsResult.value.quotaRemaining;

    res.status(200).json({
      success: true,
      data: {
        player: playerData?.player || null,
        statistics: playerData?.statistics || [],
        transfers: transfersData,
        season: parseInt(season, 10),
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

/**
 * Get full dataset index of competitions from StatsBomb open data.
 *
 * @route GET /api/football/competitions
 * @access Protected
 */
export const getCompetitions = async (req, res, next) => {
  try {
    const data = await fs.readFile(COMPETITIONS_FILE, 'utf-8');
    const competitions = JSON.parse(data);

    res.status(200).json({
      success: true,
      data: competitions,
      meta: {
        source: 'local-statsbomb-dataset'
      },
    });
  } catch (err) {
    console.error('Failed to read competitions.json:', err.message);
    next(new AppError('Failed to fetch competitions index', 500));
  }
};

/**
 * Get matches for a specific competition and season from StatsBomb open data.
 *
 * @route GET /api/football/matches/:comp_id/:season_id
 * @access Protected
 */
export const getMatchesByCompetition = async (req, res, next) => {
  try {
    const { comp_id, season_id } = req.params;
    
    // Construct path to the match JSON file for this competition and season
    const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'open-data', 'open-data-master', 'data');
    const MATCHES_FILE = path.join(DATA_DIR, 'matches', comp_id, `${season_id}.json`);
    
    try {
      const data = await fs.readFile(MATCHES_FILE, 'utf-8');
      const matches = JSON.parse(data);

      res.status(200).json({
        success: true,
        data: matches,
        meta: {
          source: 'local-statsbomb-dataset'
        },
      });
    } catch (fsErr) {
      if (fsErr.code === 'ENOENT') {
         // File doesn't exist, meaning no matches for this comp/season
         return res.status(404).json({
           success: false,
           message: `No matches found for competition ${comp_id} and season ${season_id}`,
         });
      }
      throw fsErr;
    }
  } catch (err) {
    console.error('Failed to read matches JSON:', err.message);
    next(new AppError('Failed to fetch matches', 500));
  }
};

/**
 * Get historical player stats from Transfermarkt data.
 *
 * @route GET /api/football/player/:player_id/history
 * @access Protected
 */
export const getPlayerHistory = async (req, res, next) => {
  try {
    const { player_id } = req.params;
    
    // We try to match by ID or name
    const query = {
      type: 'appearance',
      $or: [
        { 'data.player_id': player_id },
        { 'data.player_id': Number(player_id) },
        { 'data.player_name': { $regex: new RegExp(player_id, 'i') } },
      ]
    };
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new AppError('Database connection not established', 500);
    }
    
    const collection = db.collection('historical_transfermarkt');
    const appearances = await collection.find(query).toArray();
    
    // Process appearances into career stats (group by season and club)
    const statsMap = {};
    
    appearances.forEach(app => {
      const d = app.data;
      const season = d.date ? d.date.substring(0, 4) : d.season || 'Unknown';
      const club = d.player_club_id || d.club_id || 'Unknown';
      const key = `${season}-${club}`;
      
      if (!statsMap[key]) {
        statsMap[key] = {
          season,
          club,
          appearances: 0,
          goals: 0,
          assists: 0,
          minutes: 0
        };
      }
      
      statsMap[key].appearances += 1;
      statsMap[key].goals += Number(d.goals) || 0;
      statsMap[key].assists += Number(d.assists) || 0;
      statsMap[key].minutes += Number(d.minutes_played) || 0;
    });
    
    const history = Object.values(statsMap).sort((a, b) => b.season.localeCompare(a.season));
    
    res.status(200).json({
      success: true,
      data: history,
      meta: {
        source: 'mongodb-historical_transfermarkt'
      }
    });
  } catch (err) {
    console.error('Failed to fetch player history:', err.message);
    next(new AppError('Failed to fetch player history', 500));
  }
};
