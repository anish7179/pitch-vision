// ============================================
// src/config/db.js
// ============================================
// MongoDB connection via Mongoose with retry logic.
//
// INTERVIEW CONCEPT — Connection Pooling:
// Mongoose maintains an internal pool of TCP connections
// to MongoDB (default: 100). When your Express handler
// calls a Mongoose query, it grabs a free connection from
// the pool, runs the query, and returns the connection.
// This avoids the overhead of opening a new TCP + TLS
// handshake on every single database operation.
//
// We also listen for connection events (connected, error,
// disconnected) to enable observability in production.
// ============================================

import mongoose from 'mongoose';
import env from './env.js';

/**
 * Connect to MongoDB Atlas with retry logic.
 * Mongoose 8.x no longer needs useNewUrlParser / useUnifiedTopology.
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 3000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.mongoUri, {
        // Connection pool size — 10 is plenty for our traffic
        maxPoolSize: 10,
        // How long to wait for a connection from the pool (ms)
        serverSelectionTimeoutMS: 5000,
        // How long to wait for a response from the server (ms)
        socketTimeoutMS: 45000,
      });

      console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);
      return;
    } catch (err) {
      console.error(
        `❌  MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`
      );

      if (attempt === MAX_RETRIES) {
        console.error('💀  All MongoDB connection attempts exhausted. Exiting.');
        process.exit(1);
      }

      console.log(`   Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
};

// ── Connection event listeners for observability ──────────────
mongoose.connection.on('error', (err) => {
  console.error(`🔴  MongoDB runtime error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('🟡  MongoDB disconnected');
});

// Graceful shutdown — close connections when the process ends
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔒  MongoDB connection closed (SIGINT)');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  console.log('🔒  MongoDB connection closed (SIGTERM)');
  process.exit(0);
});

export default connectDB;
