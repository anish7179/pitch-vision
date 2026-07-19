// ============================================
// src/utils/jwt.js
// ============================================
// JWT token creation and verification helpers.
//
// INTERVIEW CONCEPT — JWT Structure:
// A JWT has three base64url-encoded parts separated by dots:
//
//   HEADER.PAYLOAD.SIGNATURE
//
// Header:    { "alg": "HS256", "typ": "JWT" }
// Payload:   { "sub": "userId123", "iat": 1700000000, "exp": 1700000900 }
// Signature: HMAC-SHA256(base64(header) + "." + base64(payload), secret)
//
// The server NEVER stores JWTs. It verifies the signature using
// the secret key. If the signature matches and exp hasn't passed,
// the token is valid. This is why JWT auth is "stateless."
//
// INTERVIEW CONCEPT — Why Two Secrets?
// Access tokens and refresh tokens use DIFFERENT secrets.
// If an access token secret is compromised, the attacker can
// forge 15-minute tokens, but NOT long-lived refresh tokens
// (they need the other secret). Defense in depth.
// ============================================

import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Sign a short-lived access token (15 minutes).
 *
 * @param {string} userId - The MongoDB user ID
 * @param {string} email  - The user's email
 * @returns {string} Signed JWT access token
 */
export const signAccessToken = (userId, email) => {
  return jwt.sign(
    { sub: userId, email, type: 'access' },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpiry, algorithm: 'HS256' }
  );
};

/**
 * Sign a long-lived refresh token (7 days).
 *
 * @param {string} userId - The MongoDB user ID
 * @returns {string} Signed JWT refresh token
 */
export const signRefreshToken = (userId) => {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiry, algorithm: 'HS256' }
  );
};

/**
 * Verify and decode an access token.
 *
 * @param {string} token - The JWT to verify
 * @returns {{ sub: string, email: string, type: string, iat: number, exp: number }}
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtAccessSecret, { algorithms: ['HS256'] });
};

/**
 * Verify and decode a refresh token.
 *
 * @param {string} token - The JWT to verify
 * @returns {{ sub: string, type: string, iat: number, exp: number }}
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwtRefreshSecret, { algorithms: ['HS256'] });
};
