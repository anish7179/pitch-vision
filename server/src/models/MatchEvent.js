import mongoose from 'mongoose';

const matchEventSchema = new mongoose.Schema(
  {
    matchId: {
      type: String,
      required: true,
      index: true,
    },
    teamId: {
      type: String,
      index: true,
    },
    playerId: {
      type: String,
      index: true,
    },
    playerName: {
      type: String,
    },
    type: {
      type: String,
      required: true,
      index: true,
      description: 'The type of event (e.g., Pass, Shot, Pressure)',
    },
    location: {
      type: [Number],
      description: 'Array of X, Y coordinates',
    },
    pass_end_location: {
      type: [Number],
      description: 'Array of X, Y coordinates for where a pass ends',
    },
    xg: {
      type: Number,
      description: 'Expected goals (if type is Shot)',
    },
    rawEvent: {
      type: mongoose.Schema.Types.Mixed,
      description: 'The complete raw event payload from StatsBomb',
    }
  },
  {
    timestamps: true,
  }
);

// Compound index for querying a specific player's events in a match
matchEventSchema.index({ matchId: 1, playerId: 1, type: 1 });

const MatchEvent = mongoose.model('MatchEvent', matchEventSchema);

export default MatchEvent;
