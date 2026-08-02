import { Router } from 'express';
import { getMatchSpatialEvents, getPlayerSpatialEvents } from '../controllers/spatial.controller.js';

const router = Router();

// GET /api/spatial/match/:matchId
router.get('/match/:matchId', getMatchSpatialEvents);

// GET /api/spatial/player/:playerId
router.get('/player/:playerId', getPlayerSpatialEvents);

export default router;
