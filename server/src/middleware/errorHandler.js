// ============================================
// src/middleware/errorHandler.js
// ============================================
// Global Express error handler + custom AppError class.
//
// INTERVIEW CONCEPT — Express Error Handling:
// Express has a special middleware signature with 4 parameters:
//   (err, req, res, next)
//
// When any middleware/route calls next(err) or throws, Express
// skips all remaining normal middleware and jumps to the first
// 4-param error handler. This is the "error-handling middleware"
// pattern.
//
// We distinguish two kinds of errors:
//   1. Operational errors (4xx) — expected, the client did
//      something wrong (bad input, unauthorized, not found).
//      We send a clear JSON error message.
//   2. Programming errors (5xx) — unexpected, a bug in our
//      code (null reference, unhandled promise). We log the
//      full stack trace but send a generic message to the
//      client (never leak internal details).
// ============================================

/**
 * Custom error class for operational errors.
 * Extends the native Error class with a status code and an
 * `isOperational` flag so the error handler can distinguish
 * expected errors from bugs.
 */
export class AppError extends Error {
  /**
   * @param {string} message   - Human-readable error message
   * @param {number} statusCode - HTTP status code (default: 500)
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Capture the stack trace, excluding this constructor from it
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Express error-handling middleware.
 * Must be registered LAST in the middleware chain with app.use().
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
const errorHandler = (err, req, res, _next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  const isOperational = err.isOperational || false;

  // ── Handle specific error types ──────────────────────────

  // Mongoose validation error → 400
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = `Validation failed: ${messages.join(', ')}`;
  }

  // Mongoose duplicate key error → 409
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue).join(', ');
    message = `Duplicate value for field: ${field}`;
  }

  // Mongoose cast error (invalid ObjectId) → 400
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors → 401
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // API quota exhausted → 429
  if (err.code === 'QUOTA_EXHAUSTED') {
    statusCode = 429;
  }

  // ── Log the error ────────────────────────────────────────
  if (!isOperational || statusCode >= 500) {
    // Programming error — log full stack
    console.error('🔴  Unhandled error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    // Operational error — brief log
    console.warn(`⚠️  ${statusCode} ${req.method} ${req.originalUrl}: ${message}`);
  }

  // ── Send response ────────────────────────────────────────
  const responseBody = {
    success: false,
    error: {
      message,
      statusCode,
    },
  };

  // In production, don't leak stack traces
  if (process.env.NODE_ENV === 'development' && err.stack) {
    responseBody.error.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};

export default errorHandler;
