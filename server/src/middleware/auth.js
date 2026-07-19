// ============================================
// src/middleware/auth.js
// ============================================
// JWT authentication middleware.
//
// INTERVIEW CONCEPT — Middleware Pattern:
// Express middleware is a function that sits between the
// incoming request and the route handler. It can:
//   1. Execute code (verify JWT)
//   2. Modify req/res objects (attach req.user)
//   3. End the request-response cycle (send 401)
//   4. Call next() to pass control to the next middleware
//
// This middleware extracts the JWT from the Authorization
// header, verifies it, and attaches the decoded payload
// to req.user. If verification fails, it short-circuits
// the chain with a 401 response.
//
// INTERVIEW QUESTION — "Why not use a session cookie?"
// Sessions require server-side storage (memory or DB lookup
// on every request). JWTs are self-contained — the server
// only needs the secret key to verify. This is critical for
// horizontal scaling (multiple server instances) because
// any instance can verify any JWT without shared session state.
// ============================================

import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from './errorHandler.js';

/**
 * Protect routes by requiring a valid JWT access token.
 *
 * Expected header format: Authorization: Bearer <token>
 *
 * On success, attaches to req:
 *   - req.user.id    (MongoDB _id)
 *   - req.user.email
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticate = (req, res, next) => {
  try {
    // ── Extract token from header ────────────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please provide a valid Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Authentication required. Token is empty.', 401);
    }

    // ── Verify token ─────────────────────────────────────────
    const decoded = verifyAccessToken(token);

    // Ensure this is an access token, not a refresh token
    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type. Use an access token.', 401);
    }

    // ── Attach user info to request ──────────────────────────
    req.user = {
      id: decoded.sub,
      email: decoded.email,
    };

    next();
  } catch (err) {
    // Re-throw AppErrors as-is; wrap JWT library errors
    if (err.isOperational) {
      return next(err);
    }

    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired. Please refresh your token.', 401));
    }

    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid access token.', 401));
    }

    return next(new AppError('Authentication failed.', 401));
  }
};

export default authenticate;
