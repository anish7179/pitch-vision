// ============================================
// src/server.js
// ============================================
// Express application entry point for PitchVision.
//
// PHASE 2 UPDATE — Socket.io + Redis Integration:
// ────────────────────────────────────────────────
// We now create an HTTP server manually via http.createServer()
// instead of using app.listen(). This allows Socket.io to
// attach to the SAME HTTP server and share the same port.
//
// Architecture:
//   Client ──HTTP──► Express (REST API)
//   Client ──WS────► Socket.io (real-time events)
//   Both share port 5000 via the same http.Server instance.
//
// INTERVIEW CONCEPT — Why http.createServer?
// app.listen(port) is sugar for http.createServer(app).listen(port).
// We need the raw http.Server reference to pass to Socket.io.
// Socket.io hooks into the HTTP server's 'upgrade' event to
// handle the WebSocket handshake (HTTP → WS protocol upgrade).
//
// Middleware Pipeline:
//   1. helmet     → Security HTTP headers
//   2. cors       → Cross-Origin Resource Sharing
//   3. cookieParser → Parse cookies (refresh tokens)
//   4. json       → Parse JSON request bodies
//   5. passport   → Initialize Passport (JWT, not sessions)
//   6. routes     → API route handlers
//   7. errorHandler → Global error handler (MUST be last)
// ============================================

import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import passport from './config/passport.js';
import env from './config/env.js';
import connectDB from './config/db.js';
import redisClient, { getRedisStatus } from './config/redisClient.js';
import errorHandler from './middleware/errorHandler.js';
import { startLiveMatchCron, stopLiveMatchCron, getCronStatus } from './cron/liveMatches.js';

// ── Route imports ────────────────────────────────────────────
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import footballRoutes from './routes/football.routes.js';
import spatialRoutes from './routes/spatial.routes.js';
import { syncSpatialIndexes } from './models/SpatialEvent.js';

// ── Create Express app ───────────────────────────────────────
const app = express();

// ── Create raw HTTP server (required for Socket.io) ──────────
const httpServer = createServer(app);

// ── Socket.io Server ─────────────────────────────────────────
// Attach Socket.io to the same HTTP server.
// CORS must match our Express CORS config so the React
// frontend can establish WebSocket connections.
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [env.clientUrl, 'http://127.0.0.1:5173', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  // Transports: start with polling, then upgrade to WebSocket.
  // This is the default and most reliable handshake strategy.
  transports: ['polling', 'websocket'],
  // Ping interval/timeout for detecting stale connections
  pingInterval: 25000,
  pingTimeout: 20000,
});

// Store the io instance on the app so controllers and cron
// jobs can access it via app.get('io') without circular imports.
app.set('io', io);

// ── Socket.io Connection Handling ────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌  [Socket.io] Client connected: ${socket.id}`);

  // Clients can join a room for a specific match to receive
  // targeted updates (e.g., score changes for match 12345).
  socket.on('join:match', (matchId) => {
    socket.join(`match:${matchId}`);
    console.log(`   └─ ${socket.id} joined room match:${matchId}`);
  });

  socket.on('leave:match', (matchId) => {
    socket.leave(`match:${matchId}`);
    console.log(`   └─ ${socket.id} left room match:${matchId}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌  [Socket.io] Client disconnected: ${socket.id} (${reason})`);
  });
});

// ── Security Headers ─────────────────────────────────────────
app.use(helmet());

// ── CORS Configuration ──────────────────────────────────────
app.use(
  cors({
    origin: [env.clientUrl, 'http://127.0.0.1:5173', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body Parsers ─────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Passport Initialization ─────────────────────────────────
app.use(passport.initialize());

// ── Health Check ─────────────────────────────────────────────
// Comprehensive health endpoint for monitoring.
// Reports server, MongoDB, Redis, cron, and Socket.io status.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
      environment: env.nodeEnv,
      services: {
        redis: getRedisStatus(),
        socketio: {
          connected: io.engine.clientsCount,
        },
        cron: getCronStatus(),
      },
    },
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/football', footballRoutes);
app.use('/api/spatial', spatialRoutes);

// ── 404 Handler ──────────────────────────────────────────────
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

    // Synchronize compound indexes on the SpatialEvent collection
    await syncSpatialIndexes();

    // Redis connects automatically on import via ioredis.
    // We just log its current status — no await needed because
    // Redis is a non-critical cache layer (graceful degradation).
    console.log(`🔌  [Redis] Initial status: ${getRedisStatus()}`);

    // Start the live match cron job AFTER MongoDB is connected
    startLiveMatchCron();

    // Use httpServer.listen() instead of app.listen()
    // so Socket.io shares the same port.
    httpServer.listen(env.port, () => {
      console.log('\n🏟️  ═══════════════════════════════════════════');
      console.log('   PitchVision Server (Phase 2)');
      console.log('   ═══════════════════════════════════════════');
      console.log(`   Environment : ${env.nodeEnv}`);
      console.log(`   Port        : ${env.port}`);
      console.log(`   API Base    : http://localhost:${env.port}/api`);
      console.log(`   Health      : http://localhost:${env.port}/api/health`);
      console.log(`   OAuth URL   : http://localhost:${env.port}/api/auth/google`);
      console.log(`   WebSocket   : ws://localhost:${env.port} (Socket.io)`);
      console.log(`   Redis       : ${env.redisUrl}`);
      console.log(`   Live Cron   : every 5 minutes (UTC)`);
      console.log('   ═══════════════════════════════════════════\n');
    });
  } catch (err) {
    console.error('💀  Failed to start server:', err.message);
    process.exit(1);
  }
};

// ── Graceful Shutdown ────────────────────────────────────────
// Clean up Socket.io, Redis, and cron on process exit
const gracefulShutdown = async (signal) => {
  console.log(`\n🔒  Received ${signal}. Shutting down gracefully...`);

  // Stop accepting new connections
  stopLiveMatchCron();

  // Close Socket.io
  io.close(() => {
    console.log('🔒  Socket.io closed');
  });

  // Disconnect Redis
  try {
    await redisClient.quit();
    console.log('🔒  Redis disconnected');
  } catch (err) {
    // Redis might already be disconnected
    console.warn(`⚠️  Redis disconnect: ${err.message}`);
  }

  // Close HTTP server
  httpServer.close(() => {
    console.log('🔒  HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    console.error('💀  Forced exit after 10s timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

export { io };
export default app;
