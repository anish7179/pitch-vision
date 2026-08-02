import mongoose from 'mongoose';

const historicalPlayerSchema = new mongoose.Schema(
  {
    playerId: {
      type: Number,
      required: true,
      index: true,
    },
    season: {
      type: Number,
      required: true,
      index: true,
    },
    playerProfile: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      description: 'Raw player profile information',
    },
    statistics: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
      description: 'Raw player statistics for the season',
    },
    transfers: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
      description: 'Raw transfer history for the player',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one record per player per season
historicalPlayerSchema.index({ playerId: 1, season: 1 }, { unique: true });

const HistoricalPlayer = mongoose.model('HistoricalPlayer', historicalPlayerSchema);

export default HistoricalPlayer;
