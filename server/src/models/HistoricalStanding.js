import mongoose from 'mongoose';

const historicalStandingSchema = new mongoose.Schema(
  {
    leagueId: {
      type: Number,
      required: true,
      index: true,
    },
    season: {
      type: Number,
      required: true,
      index: true,
    },
    standings: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      description: 'Raw API-Football standings array for the specified league and season',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one record per league per season
historicalStandingSchema.index({ leagueId: 1, season: 1 }, { unique: true });

const HistoricalStanding = mongoose.model('HistoricalStanding', historicalStandingSchema);

export default HistoricalStanding;
