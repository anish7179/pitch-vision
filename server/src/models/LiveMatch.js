// ============================================
// src/models/LiveMatch.js
// ============================================
// Mongoose schema for caching live match data from API-Football.
//
// INTERVIEW CONCEPT — MongoDB TTL Indexes:
// ─────────────────────────────────────────
// WHAT: A TTL (Time-To-Live) index is a special single-field
// index on a Date field. MongoDB runs a background thread every
// 60 seconds that checks the index and deletes any document
// whose TTL-indexed Date field is older than `expireAfterSeconds`.
//
// HOW IT WORKS HERE:
//   - Our cron job upserts live match data every 5 minutes.
//   - Each document has an `updatedAt` field (auto-set by Mongoose).
//   - We set `expireAfterSeconds: 360` (6 minutes) on `updatedAt`.
//   - If the cron job runs successfully, it refreshes `updatedAt`
//     → the document survives another 6 minutes.
//   - If the cron job STOPS running (server crash, no live matches),
//     stale data auto-deletes within ~7 minutes (6 min TTL + 60 sec sweep).
//
// WHY THIS IS EFFICIENT:
//   1. Zero cleanup code — MongoDB handles deletion automatically
//   2. No cron job needed for garbage collection
//   3. The collection stays small (only active live matches)
//   4. Reads are always fresh — stale data self-destructs
//
// ALTERNATIVE — Manual cleanup with a scheduled job:
//   You'd need a separate cron to query + delete old docs.
//   More code, more failure modes, same result. TTL wins.
//
// INTERVIEW TIP: TTL indexes have a ~60-second resolution.
// Documents may live up to 60 seconds past their expiry time.
// For our use case (5-minute refresh cycles), this is fine.
// For sub-second TTL needs, use Redis with EXPIRE instead.
// ============================================

import mongoose from 'mongoose';

const liveMatchSchema = new mongoose.Schema(
  {
    matchId: {
      type: Number,
      required: [true, 'Match ID is required'],
      unique: true,
      index: true,
    },

    // ── Match Info ───────────────────────────────────────
    referee: { type: String, default: 'TBD' },
    timezone: { type: String, default: 'UTC' },
    dateTime: { type: String },
    timestamp: { type: Number },
    venue: {
      name: String,
      city: String,
    },
    status: {
      long: String,   // "First Half", "Second Half", "Match Finished"
      short: String,  // "1H", "2H", "FT", "HT"
      elapsed: Number, // Minutes elapsed
      extra: Number,   // Extra time minutes (if any)
    },

    // ── League ───────────────────────────────────────────
    league: {
      id: Number,
      name: String,
      country: String,
      logo: String,
      flag: String,
      season: Number,
      round: String,
    },

    // ── Teams ────────────────────────────────────────────
    teams: {
      home: { id: Number, name: String, logo: String },
      away: { id: Number, name: String, logo: String },
    },

    // ── Score ────────────────────────────────────────────
    goals: {
      home: { type: Number, default: null },
      away: { type: Number, default: null },
    },
    score: {
      halftime: { home: Number, away: Number },
      fulltime: { home: Number, away: Number },
      extratime: { home: Number, away: Number },
      penalty: { home: Number, away: Number },
    },

    // ── Events (goals, cards, subs) ─────────────────────
    events: [
      {
        _id: false,
        timeElapsed: Number,
        timeExtra: Number,
        teamId: Number,
        teamName: String,
        player: { id: Number, name: String },
        assist: { id: Number, name: String },
        type: String,     // "Goal", "Card", "subst", "Var"
        detail: String,   // "Normal Goal", "Yellow Card", "Substitution 1"
        comments: String,
      },
    ],

    // ── Lineups ─────────────────────────────────────────
    lineups: [
      {
        _id: false,
        teamId: Number,
        teamName: String,
        teamLogo: String,
        formation: String,
        startXI: [
          {
            _id: false,
            id: Number,
            name: String,
            number: Number,
            pos: String,
            grid: String,
          },
        ],
        substitutes: [
          {
            _id: false,
            id: Number,
            name: String,
            number: Number,
            pos: String,
          },
        ],
        coach: { id: Number, name: String, photo: String },
      },
    ],

    // ── Match Statistics ────────────────────────────────
    // Stored as a map per team: { "Shots on Goal": 5, "Possession": "60%" }
    statistics: [
      {
        _id: false,
        teamId: Number,
        teamName: String,
        stats: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
    ],

    // ── Per-Player Match Stats ──────────────────────────
    playerStats: [
      {
        _id: false,
        teamId: Number,
        players: [
          {
            _id: false,
            id: Number,
            name: String,
            photo: String,
            stats: { type: mongoose.Schema.Types.Mixed, default: null },
          },
        ],
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt + updatedAt automatically
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── TTL Index ────────────────────────────────────────────────
// Auto-delete documents 6 minutes after their last update.
// The cron job runs every 5 minutes, so active live matches get
// refreshed before the TTL triggers. Matches that go to "FT"
// (Full Time) stop getting refreshed and auto-expire.
liveMatchSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 360 });

const LiveMatch = mongoose.model('LiveMatch', liveMatchSchema);

export default LiveMatch;
