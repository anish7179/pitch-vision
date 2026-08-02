import mongoose from 'mongoose';

const historicalTeamSchema = new mongoose.Schema(
  {
    teamId: {
      type: Number,
      required: true,
      index: true,
    },
    season: {
      type: Number,
      required: true,
      index: true,
    },
    teamInfo: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      description: 'Raw team info response',
    },
    squad: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
      description: 'Raw squad list response',
    },
    standings: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
      description: 'Raw team standings in leagues',
    },
    recentFixtures: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
      description: 'Raw match history for the season',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one record per team per season
historicalTeamSchema.index({ teamId: 1, season: 1 }, { unique: true });

const HistoricalTeam = mongoose.model('HistoricalTeam', historicalTeamSchema);

export default HistoricalTeam;
