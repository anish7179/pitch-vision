// ============================================
// src/server.js
// ============================================
// Express application entry point for PitchVision.
//
// INTERVIEW CONCEPT — Middleware Pipeline:
// Express processes requests through a pipeline of middleware
// functions, in the ORDER they are registered with app.use().
//
// Our pipeline:
//   1. helmet     → Sets security HTTP headers (HSTS, X-Frame-Options, etc.)
//   2. cors       → Handles Cross-Origin Resource Sharing preflight
//   3. cookieParser → Parses cookies into req.cookies (needed for refresh tokens)
//   4. json       → Parses JSON request bodies into req.body
//   5. passport   → Initializes Passport (but does NOT authenticate every request)
//   6. routes     → Our route handlers
//   7. errorHandler → Global error handler (MUST be last)
//
// INTERVIEW QUESTION — "Why is error handler order important?"
// Express only routes to error-handling middleware (4-param)
// when next(err) is called. If the error handler is registered
// BEFORE the routes, errors from routes won't reach it because
// Express processes middleware in registration order.
// ============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from './config/passport.js';
import env from './config/env.js';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import { startLiveMatchCron, stopLiveMatchCron, getCronStatus } from './cron/liveMatches.js';

// ── Route imports ────────────────────────────────────────────
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import footballRoutes from './routes/football.routes.js';

// ── Create Express app ───────────────────────────────────────
const app = express();

// ── Security Headers ─────────────────────────────────────────
// Helmet sets ~15 security headers. In production, this protects
// against clickjacking, XSS, MIME sniffing, and more.
app.use(helmet());

// ── CORS Configuration ──────────────────────────────────────
// Allow the React frontend to make requests to this API.
// credentials: true is required for httpOnly cookies (refresh tokens).
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body Parsers ─────────────────────────────────────────────
// Parse cookies (refresh tokens live here)
app.use(cookieParser());

// Parse JSON bodies with a 1MB limit (prevent DoS via huge payloads)
app.use(express.json({ limit: '1mb' }));

// Parse URL-encoded bodies (for form submissions, if any)
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Passport Initialization ─────────────────────────────────
// Initialize Passport but do NOT use express-session.
// We handle auth via JWTs, not server-side sessions.
app.use(passport.initialize());

// ── Health Check ─────────────────────────────────────────────
// Simple endpoint for load balancers and monitoring.
// Returns 200 if the server is running.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
      environment: env.nodeEnv,
      cronStatus: getCronStatus(),
    },
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/football', footballRoutes);

// ── 404 Handler ──────────────────────────────────────────────
// Catch all unmatched routes AFTER the route registrations
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    },
  });
});

// ── Global Error Handler (MUST be last) ──────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────
const startServer = async () => {
  try {
    // Connect to MongoDB (with retry logic)
    await connectDB();

    // Start listening
    // Start the live match cron job AFTER MongoDB is connected
    startLiveMatchCron();

    app.listen(env.port, () => {
      console.log('\n🏟️  ═══════════════════════════════════════════');
      console.log('   PitchVision Server');
      console.log('   ═══════════════════════════════════════════');
      console.log(`   Environment : ${env.nodeEnv}`);
      console.log(`   Port        : ${env.port}`);
      console.log(`   API Base    : http://localhost:${env.port}/api`);
      console.log(`   Health      : http://localhost:${env.port}/api/health`);
      console.log(`   OAuth URL   : http://localhost:${env.port}/api/auth/google`);
      console.log(`   Live Cron   : every 5 minutes (UTC)`);
      console.log('   ═══════════════════════════════════════════\n');
    });
  } catch (err) {
    console.error('💀  Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

export default app;
