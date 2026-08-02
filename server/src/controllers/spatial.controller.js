import SpatialEvent from '../models/SpatialEvent.js';

/**
 * GET /api/spatial/match/:matchId
 * Queries MongoDB for matching spatial events and returns an array of coordinate objects.
 */
export const getMatchSpatialEvents = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { eventType, team } = req.query;

    if (!matchId || matchId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid or missing match ID.' });
    }

    const query = { match_id: matchId };
    
    // Optional filters
    if (eventType) query.event_type = eventType;
    if (team) query.team = team;

    // Utilize .lean() to bypass heavy Mongoose document wrapping
    // Select only the requested coordinates and xg to minimize payload size
    const events = await SpatialEvent.find(query)
      .select('start_x start_y end_x end_y xg event_type team player_id -_id')
      .lean();

    if (!events.length) {
      return res.status(404).json({ success: false, message: 'No spatial events found for this match.' });
    }

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Error in getMatchSpatialEvents:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching match spatial data.' });
  }
};

/**
 * GET /api/spatial/player/:playerId
 * Fetches spatial event coordinates aggregated for a specific player across all matches.
 */
export const getPlayerSpatialEvents = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { season } = req.query; 

    if (!playerId || playerId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid or missing player ID.' });
    }

    const query = { player_id: playerId };
    
    // If season is provided, it utilizes the { player_id: 1, season: 1 } compound index
    if (season) query.season = season;

    // Use .lean() for fast read performance
    const events = await SpatialEvent.find(query)
      .select('start_x start_y end_x end_y xg event_type match_id -_id')
      .lean();

    if (!events.length) {
      return res.status(404).json({ success: false, message: 'No spatial events found for this player.' });
    }

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Error in getPlayerSpatialEvents:', error);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching player spatial data.' });
  }
};
