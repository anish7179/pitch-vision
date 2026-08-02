import { Router } from 'express';
import { getMatchSpatialEvents, getPlayerSpatialEvents, getMatches, getMatchMeta } from '../controllers/spatial.controller.js';

const router = Router();

// GET /api/spatial/matches
router.get('/matches', getMatches);

// GET /api/spatial/match/:matchId
router.get('/match/:matchId', getMatchSpatialEvents);

// GET /api/spatial/match/:matchId/meta
router.get('/match/:matchId/meta', getMatchMeta);

// GET /api/spatial/player/:playerId
router.get('/player/:playerId', getPlayerSpatialEvents);

export default router;
