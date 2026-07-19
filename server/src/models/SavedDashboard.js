// ============================================
// src/models/SavedDashboard.js
// ============================================
// Schema for user-saved scorecards, comparisons, and heatmaps.
//
// INTERVIEW CONCEPT — Mixed SchemaType:
// The `config` field uses Schema.Types.Mixed, which accepts
// any valid JSON structure. This is intentional because
// different dashboard types have different shapes:
//
//   Scorecard:  { fixtureId: 123, league: 'PL' }
//   Comparison: { playerIds: [44, 55], season: 2024 }
//   Heatmap:    { playerId: 44, matchId: 123, grid: [...] }
//
// Using Mixed gives us flexibility without creating separate
// collections for each type. The tradeoff: Mongoose can't
// validate the inner structure. We handle that in the
// controller layer with explicit checks.
//
// INTERVIEW CONCEPT — Referencing vs. Embedding:
// We REFERENCE the user (userId → ObjectId) rather than
// embedding dashboards inside the User document. Why?
//   1. A user could save hundreds of dashboards (16MB limit)
//   2. We need to query dashboards independently (pagination)
//   3. Deleting a dashboard shouldn't require updating the User doc
// ============================================

import mongoose from 'mongoose';

const savedDashboardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Dashboard type is required'],
      enum: {
        values: ['scorecard', 'comparison', 'heatmap'],
        message: 'Type must be one of: scorecard, comparison, heatmap',
      },
    },
    title: {
      type: String,
      required: [true, 'Dashboard title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Dashboard config is required'],
    },
    s3Key: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
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

// Compound index: efficiently query "all dashboards for user X, newest first"
savedDashboardSchema.index({ userId: 1, createdAt: -1 });

const SavedDashboard = mongoose.model('SavedDashboard', savedDashboardSchema);

export default SavedDashboard;
