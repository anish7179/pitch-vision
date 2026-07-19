// ============================================
// src/controllers/dashboard.controller.js
// ============================================
// CRUD operations for saved dashboards.
//
// INTERVIEW CONCEPT — Authorization vs. Authentication:
//   Authentication = "Who are you?" (handled by JWT middleware)
//   Authorization  = "What can you do?" (handled here)
//
// Every query is scoped to req.user.id, ensuring users can
// only access their OWN dashboards. This is called
// "row-level security" — even if a user guesses another
// dashboard's ObjectId, the query includes their userId
// as a filter, so it returns nothing.
//
// INTERVIEW CONCEPT — Pagination:
// We use cursor-based pagination (skip + limit) for the
// getAll endpoint. In an interview, know the tradeoff:
//   - Offset pagination (skip/limit): Simple, supports "jump
//     to page 5", but O(n) for large offsets (MongoDB scans
//     and discards skipped docs).
//   - Cursor pagination (createdAt > lastSeen): O(1) for all
//     pages, but can't jump to arbitrary pages.
// For our use case (small datasets per user), offset is fine.
// ============================================

import SavedDashboard from '../models/SavedDashboard.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Create a new saved dashboard.
 *
 * @route POST /api/dashboards
 * @access Protected
 */
export const createDashboard = async (req, res, next) => {
  try {
    const { type, title, config } = req.body;

    if (!type || !title || !config) {
      throw new AppError('Missing required fields: type, title, config', 400);
    }

    const dashboard = await SavedDashboard.create({
      userId: req.user.id,
      type,
      title,
      config,
    });

    res.status(201).json({
      success: true,
      data: { dashboard },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all dashboards for the authenticated user (paginated).
 *
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 10, max: 50)
 *   - type (optional filter: 'scorecard' | 'comparison' | 'heatmap')
 *
 * @route GET /api/dashboards
 * @access Protected
 */
export const getAllDashboards = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Build filter — always scoped to the authenticated user
    const filter = { userId: req.user.id };

    // Optional type filter
    if (req.query.type) {
      const validTypes = ['scorecard', 'comparison', 'heatmap'];
      if (!validTypes.includes(req.query.type)) {
        throw new AppError(
          `Invalid type filter. Must be one of: ${validTypes.join(', ')}`,
          400
        );
      }
      filter.type = req.query.type;
    }

    const [dashboards, total] = await Promise.all([
      SavedDashboard.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // .lean() returns plain objects (faster, less memory)
      SavedDashboard.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        dashboards,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single dashboard by ID.
 *
 * @route GET /api/dashboards/:id
 * @access Protected
 */
export const getDashboardById = async (req, res, next) => {
  try {
    const dashboard = await SavedDashboard.findOne({
      _id: req.params.id,
      userId: req.user.id, // Row-level security
    });

    if (!dashboard) {
      throw new AppError('Dashboard not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: { dashboard },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update a dashboard (title, config, s3Key).
 *
 * @route PATCH /api/dashboards/:id
 * @access Protected
 */
export const updateDashboard = async (req, res, next) => {
  try {
    // Whitelist allowed update fields — prevent overwriting userId, type, etc.
    const allowedFields = ['title', 'config', 's3Key'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('No valid fields to update. Allowed: title, config, s3Key', 400);
    }

    const dashboard = await SavedDashboard.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id, // Row-level security
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!dashboard) {
      throw new AppError('Dashboard not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: { dashboard },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a dashboard.
 *
 * @route DELETE /api/dashboards/:id
 * @access Protected
 */
export const deleteDashboard = async (req, res, next) => {
  try {
    const dashboard = await SavedDashboard.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id, // Row-level security
    });

    if (!dashboard) {
      throw new AppError('Dashboard not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: { message: 'Dashboard deleted successfully' },
    });
  } catch (err) {
    next(err);
  }
};
