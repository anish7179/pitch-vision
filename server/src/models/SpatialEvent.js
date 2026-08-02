import mongoose from 'mongoose';

const spatialEventSchema = new mongoose.Schema({
  event_id: { type: String, required: true },
  match_id: { type: String, required: true },
  player_id: { type: String, required: true },
  player_name: { type: String },
  team: { type: String },
  event_type: { type: String },
  start_x: { type: Number },
  start_y: { type: Number },
  end_x: { type: Number },
  end_y: { type: Number },
  xg: { type: Number, default: null },
  is_goal: { type: Boolean, default: false },
  season: { type: String } // Useful for the player + season compound index
});

// 1. Schema Indexing
// Compound index for fast lookup of match-specific heatmaps and pass maps
spatialEventSchema.index({ match_id: 1, event_type: 1 });

// Compound index for career player heatmaps
spatialEventSchema.index({ player_id: 1, season: 1 });

// Ensure indexes are built in development and production
spatialEventSchema.set('autoIndex', true);

const SpatialEvent = mongoose.model('SpatialEvent', spatialEventSchema);

// 2. Auto-Index Script / Schema Hook
// Lightweight Node.js utility to forcefully synchronize indexes on startup if needed.
export const syncSpatialIndexes = async () => {
    try {
        await SpatialEvent.syncIndexes();
        console.log('✅ SpatialEvent compound indexes synchronized successfully.');
    } catch (err) {
        console.error('❌ Error synchronizing SpatialEvent indexes:', err);
    }
};

export default SpatialEvent;
