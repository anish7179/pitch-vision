// ============================================
// src/routes/auth.routes.js
// ============================================
// Authentication routes — Google OAuth flow, JWT refresh, logout.
//
// Route map:
//   GET  /api/auth/google          → Initiate Google OAuth
//   GET  /api/auth/google/callback → Handle Google redirect
//   POST /api/auth/refresh         → Refresh access token
//   POST /api/auth/logout          → Logout (clear cookies)
//   GET  /api/auth/me              → Get user profile (protected)
//   GET  /api/auth/quota           → Get API quota usage (protected)
// ============================================

import { Router } from 'express';
import passport from '../config/passport.js';
import {
  googleCallback,
  refreshAccessToken,
  logout,
  getProfile,
} from '../controllers/auth.controller.js';
import authenticate from '../middleware/auth.js';
import { getUsageStats } from '../utils/rateLimiter.js';

const router = Router();

// ── Google OAuth Flow ────────────────────────────────────────

/**
 * @route   GET /api/auth/google
 * @desc    Redirect user to Google's consent screen
 * @access  Public
 *
 * Passport's authenticate() returns a middleware that:
 *   1. Builds the Google OAuth URL with client_id, redirect_uri, scope
 *   2. Sends a 302 redirect to that URL
 *   3. User sees Google's "Allow access?" screen
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,    // We don't use server sessions — JWTs instead
    accessType: 'offline', // Request a refresh token from Google (just in case)
    prompt: 'consent',     // Always show consent screen (good for development)
  })
);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google's redirect after user consents
 * @access  Public (called by Google)
 *
 * Flow:
 *   1. Passport exchanges the authorization code for tokens
 *   2. Passport calls our verify callback (in passport.js)
 *   3. Our callback finds/creates the user in MongoDB
 *   4. Passport attaches the user to req.user
 *   5. We issue our own JWTs in the googleCallback controller
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/api/auth/google/failure',
  }),
  googleCallback
);

/**
 * @route   GET /api/auth/google/failure
 * @desc    Handle Google OAuth failure
 * @access  Public
 */
router.get('/google/failure', (req, res) => {
  res.status(401).json({
    success: false,
    error: {
      message: 'Google authentication failed. Please try again.',
      statusCode: 401,
    },
  });
});

// ── Token Management ─────────────────────────────────────────

/**
 * @route   POST /api/auth/refresh
 * @desc    Exchange a valid refresh token for a new access token
 * @access  Public (but requires valid refresh token cookie)
 */
router.post('/refresh', refreshAccessToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Clear refresh token cookie and invalidate session
 * @access  Public
 */
router.post('/logout', logout);

// ── Protected Routes ─────────────────────────────────────────

/**
 * @route   GET /api/auth/me
 * @desc    Get the authenticated user's profile
 * @access  Protected (requires valid access token)
 */
router.get('/me', authenticate, getProfile);

/**
 * @route   GET /api/auth/quota
 * @desc    Get current API-Football usage stats for today
 * @access  Protected
 *
 * Response: { date, count, limit, remaining }
 * This lets the frontend show a quota indicator to the user.
 */
router.get('/quota', authenticate, async (req, res, next) => {
  try {
    const stats = await getUsageStats();
    res.status(200).json({
      success: true,
      data: { quota: stats },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
