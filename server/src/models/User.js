// ============================================
// src/models/User.js
// ============================================
// User schema for Google OAuth authenticated users.
//
// INTERVIEW CONCEPT — Schema Design Decisions:
//
// 1. googleId is unique + indexed: This is the primary lookup
//    key when a user signs in via OAuth. An index makes this
//    an O(log n) B-tree lookup instead of a full collection scan.
//
// 2. refreshTokenHash: We store a bcrypt-like hash of the refresh
//    token, NOT the raw token. If the database is compromised,
//    attackers can't use the hashed value to forge sessions.
//    (We use Node's built-in crypto.createHash for speed since
//    refresh tokens are already high-entropy random strings.)
//
// 3. favoriteTeams / favoritePlayers: Arrays of API-Football IDs.
//    Stored directly on the user for fast reads (no JOIN needed).
//    These arrays will be small (<20 items), so embedding is
//    the correct Mongoose pattern vs. a separate collection.
// ============================================

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: [true, 'Google ID is required'],
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },
    avatar: {
      type: String,
      default: '',
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false, // Excluded from queries by default for security
    },
    favoriteTeams: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: 'Cannot have more than 20 favorite teams',
      },
    },
    favoritePlayers: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: 'Cannot have more than 20 favorite players',
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: {
      // Transform the output when converting to JSON
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.refreshTokenHash;
        return ret;
      },
    },
  }
);

const User = mongoose.model('User', userSchema);

export default User;
