// ============================================
// src/config/passport.js
// ============================================
// Google OAuth 2.0 strategy configuration via Passport.js.
//
// INTERVIEW CONCEPT — Passport.js Strategy Pattern:
// Passport uses the Strategy design pattern. Each authentication
// method (Google, Facebook, Local, JWT) is a "strategy" — an
// encapsulated algorithm that Passport can swap at runtime.
//
// The GoogleStrategy handles:
//   1. Redirecting the user to Google's consent screen
//   2. Receiving the authorization code on callback
//   3. Exchanging the code for Google tokens (server-to-server)
//   4. Fetching the user's profile from Google
//   5. Calling our verify callback with the profile data
//
// Our verify callback (below) finds or creates the user in
// MongoDB and passes the user object to Passport, which
// attaches it to req.user.
//
// IMPORTANT: We only use Passport for the OAuth handshake.
// After that, we issue our OWN JWTs and Passport is not
// involved in subsequent request authentication.
// ============================================

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import env from './env.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: env.googleClientId,
      clientSecret: env.googleClientSecret,
      callbackURL: env.googleCallbackUrl,
      // Request these scopes from Google
      scope: ['profile', 'email'],
    },
    /**
     * Verify callback — called after Google returns the user's profile.
     *
     * @param {string} accessToken  - Google access token (we don't store this)
     * @param {string} refreshToken - Google refresh token (we don't store this)
     * @param {object} profile      - Google profile data
     * @param {Function} done       - Passport callback: done(err, user)
     */
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract profile data from Google's response
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const displayName = profile.displayName || 'PitchVision User';
        const avatar = profile.photos?.[0]?.value || '';

        if (!email) {
          return done(new Error('No email found in Google profile'), null);
        }

        // Find existing user or create a new one
        let user = await User.findOne({ googleId });

        if (user) {
          // Update profile info in case it changed on Google's side
          user.email = email;
          user.displayName = displayName;
          user.avatar = avatar;
          await user.save();
        } else {
          // Check if a user with this email exists (linked to another provider in the future)
          user = await User.findOne({ email });

          if (user) {
            // Link Google ID to existing account
            user.googleId = googleId;
            user.displayName = displayName;
            user.avatar = avatar;
            await user.save();
          } else {
            // Brand new user
            user = await User.create({
              googleId,
              email,
              displayName,
              avatar,
            });
            console.log(`🆕  New user registered: ${email}`);
          }
        }

        return done(null, user);
      } catch (err) {
        console.error('🔴  Passport Google strategy error:', err.message);
        return done(err, null);
      }
    }
  )
);

// ── Serialize / Deserialize ──────────────────────────────────
// These are required by Passport even though we don't use
// session-based auth. They convert the user object to/from
// a session identifier.

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
