// ============================================
// src/controllers/auth.controller.js
// ============================================
// Handles Google OAuth callback, JWT issuance, token
// refresh, logout, and profile retrieval.
//
// INTERVIEW CONCEPT — Refresh Token Rotation:
// When a client uses a refresh token to get a new access token,
// we issue a NEW refresh token and invalidate the old one.
// This limits the window of a stolen refresh token.
//
// Flow:
//   1. Client sends refresh token (httpOnly cookie)
//   2. Server verifies it and checks the hash matches DB
//   3. Server issues NEW access + refresh tokens
//   4. Server updates the hash in DB (old refresh token is now invalid)
//   5. Server sets the new refresh token cookie
//
// If an attacker steals and uses the old refresh token AFTER
// rotation, the hash won't match → we know there's a breach
// and can invalidate all sessions for that user.
// ============================================

import crypto from 'crypto';
import User from '../models/User.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';
import env from '../config/env.js';

/**
 * Hash a refresh token using SHA-256.
 * We store this hash in the DB, not the raw token.
 *
 * @param {string} token
 * @returns {string} Hex-encoded SHA-256 hash
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Set the refresh token as an httpOnly cookie.
 *
 * httpOnly: JavaScript can't access it (XSS protection)
 * secure:   Only sent over HTTPS (in production)
 * sameSite: 'lax' prevents CSRF on cross-origin POST
 * maxAge:   7 days (matches JWT expiry)
 *
 * @param {import('express').Response} res
 * @param {string} refreshToken
 */
const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/auth', // Only sent to auth routes
  });
};

/**
 * Google OAuth callback handler.
 * Called by Passport after successful Google authentication.
 * Issues JWT pair and redirects to the frontend.
 *
 * @route GET /api/auth/google/callback
 */
export const googleCallback = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      throw new AppError('Authentication failed. No user data from Google.', 401);
    }

    // Issue tokens
    const accessToken = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id);

    // Store hashed refresh token in DB
    await User.findByIdAndUpdate(user.id, {
      refreshTokenHash: hashToken(refreshToken),
    });

    // Set refresh token as httpOnly cookie
    setRefreshCookie(res, refreshToken);

    // Redirect to frontend with access token as URL parameter.
    // The frontend will extract it, store it in memory (NOT localStorage),
    // and remove it from the URL.
    //
    // INTERVIEW NOTE: Passing the access token via URL fragment (#) would
    // be more secure (fragments aren't sent to servers in HTTP logs), but
    // query params are simpler and our access tokens are short-lived (15min).
    const redirectUrl = `${env.clientUrl}/auth/callback?token=${accessToken}`;
    res.redirect(redirectUrl);
  } catch (err) {
    next(err);
  }
};

/**
 * Refresh the access token using the refresh token cookie.
 *
 * @route POST /api/auth/refresh
 */
export const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new AppError('No refresh token provided. Please log in again.', 401);
    }

    // Verify the JWT signature and expiry
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      // Clear the invalid cookie
      res.clearCookie('refreshToken', { path: '/api/auth' });

      if (err.name === 'TokenExpiredError') {
        throw new AppError('Refresh token expired. Please log in again.', 401);
      }
      throw new AppError('Invalid refresh token. Please log in again.', 401);
    }

    // Verify token type
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type.', 401);
    }

    // Find user and verify the stored hash matches
    const user = await User.findById(decoded.sub).select('+refreshTokenHash');

    if (!user) {
      throw new AppError('User not found. Account may have been deleted.', 401);
    }

    if (!user.refreshTokenHash) {
      throw new AppError('No active session. Please log in again.', 401);
    }

    const tokenHash = hashToken(refreshToken);
    if (tokenHash !== user.refreshTokenHash) {
      // Hash mismatch — possible token theft!
      // Invalidate ALL sessions for this user as a safety measure
      console.warn(`🚨  Refresh token hash mismatch for user ${user.email}. Possible token theft!`);
      user.refreshTokenHash = null;
      await user.save();
      res.clearCookie('refreshToken', { path: '/api/auth' });
      throw new AppError('Session invalidated due to suspicious activity. Please log in again.', 401);
    }

    // ── Token Rotation ─────────────────────────────────────
    // Issue new token pair and invalidate the old refresh token
    const newAccessToken = signAccessToken(user.id, user.email);
    const newRefreshToken = signRefreshToken(user.id);

    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    setRefreshCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logout — clear the refresh token cookie and nullify the DB hash.
 *
 * @route POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      // Verify and nullify the user's stored hash
      try {
        const decoded = verifyRefreshToken(refreshToken);
        await User.findByIdAndUpdate(decoded.sub, {
          refreshTokenHash: null,
        });
      } catch (_err) {
        // Token is invalid/expired — just clear the cookie
      }
    }

    res.clearCookie('refreshToken', { path: '/api/auth' });

    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get the current authenticated user's profile.
 *
 * @route GET /api/auth/me
 * @access Protected (requires JWT)
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};
