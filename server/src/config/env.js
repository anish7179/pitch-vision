// ============================================
// src/config/env.js
// ============================================
// Validates ALL required environment variables at startup.
// Fails fast with clear error messages so you never debug
// a "undefined" config value at runtime.
//
// INTERVIEW CONCEPT — Fail-Fast Principle:
// It's always better to crash at startup with a clear message
// than to silently run with missing config and fail at an
// unpredictable point during a user request.
// ============================================

import dotenv from 'dotenv';

dotenv.config();

const requiredVars = [
  'MONGODB_URI',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL',
  'API_FOOTBALL_KEY',
  'API_FOOTBALL_BASE_URL',
];

const missing = requiredVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('\n❌  Missing required environment variables:');
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error('\n   Copy .env.example to .env and fill in your values.\n');
  process.exit(1);
}

/**
 * Frozen configuration object — immutable at runtime.
 * Object.freeze prevents accidental mutation of config values.
 */
const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  // MongoDB
  mongoUri: process.env.MONGODB_URI,

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,

  // JWT
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiry: '15m',
  jwtRefreshExpiry: '7d',

  // Frontend
  clientUrl: process.env.CLIENT_URL,

  // API-Football
  apiFootballKey: process.env.API_FOOTBALL_KEY,
  apiFootballBaseUrl: process.env.API_FOOTBALL_BASE_URL,
  apiFootballDailyLimit: parseInt(process.env.API_FOOTBALL_DAILY_LIMIT, 10) || 90,

  // Redis (optional — server degrades gracefully without it)
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
});

export default env;
