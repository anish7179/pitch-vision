// ============================================
// src/components/PitchRenderer.jsx
// ============================================
// Pure presentational Canvas component for PitchVision.
//
// This component has NO data fetching, NO complex state, and
// NO side effects beyond drawing to a <canvas> element. It
// receives pre-scaled coordinates from SpatialPitchContainer
// and renders them using the HTML5 Canvas 2D API.
//
// INTERVIEW CONCEPT — Presentational Component:
// By isolating all rendering logic here, the data layer
// (SpatialPitchContainer) and the rendering layer (this file)
// can evolve independently. If we ever migrate from Canvas
// to WebGL/Three.js, only this file needs to change.
//
// HIGH-DPI SUPPORT:
// On Retina/4K displays, CSS pixels ≠ physical pixels.
// We scale the canvas buffer by window.devicePixelRatio
// and then scale the drawing context back down, so lines
// render at native resolution without appearing blurry.
// ============================================

import React, { useRef, useEffect } from 'react';

// Anish Dhananjay Pawar (23BCE11329)

/**
 * @param {object} props
 * @param {Array}  props.events     - Array of scaled event objects
 *   Each object contains: { startPx, startPy, endPx, endPy, xg, event_type, is_goal }
 * @param {number} props.width      - Container width in CSS pixels
 * @param {number} props.height     - Container height in CSS pixels
 * @param {string} [props.renderMode='events'] - Display mode: 'events' | 'heatmap'
 */
export default function PitchRenderer({ events = [], width, height, renderMode = 'events' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;

    const ctx = canvas.getContext('2d');

    // ── High-DPI Scaling ──────────────────────────────────
    // devicePixelRatio is typically 2 on Retina, 1 on standard.
    // We size the canvas buffer at 2x (or Nx) the CSS size,
    // then scale the context back so all draw calls use CSS
    // coordinates but render at full native resolution.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // ── Clear Canvas ──────────────────────────────────────
    // Wipe the entire buffer before every redraw to prevent
    // ghosting from previous frames.
    ctx.clearRect(0, 0, width, height);

    // ── Draw Pitch Markings (subtle background) ───────────
    drawPitchMarkings(ctx, width, height);

    // ── Mode-Based Rendering ──────────────────────────────
    if (renderMode === 'heatmap') {
      // Mode 1: Native Canvas Density Heatmap
      drawHeatmap(ctx, events);
    } else {
      // Mode 2: Event Vectors (Passes & Shots)
      // Separate events by type for layered rendering.
      // Passes are drawn first (bottom layer), then shots on
      // top so they are always visible over the pass network.
      const passes = [];
      const shots = [];

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (event.event_type === 'Shot') {
          shots.push(event);
        } else {
          // Default: treat Pass, Carry, and any other type as a line
          passes.push(event);
        }
      }

      // Layer 1: Passes (thin semi-transparent lines)
      drawPasses(ctx, passes);

      // Layer 2: Shots (xG-scaled circles)
      drawShots(ctx, shots);
    }

  }, [events, width, height, renderMode]);

  return (
    <canvas
      ref={canvasRef}
      // CSS dimensions control the visual size on screen.
      // The internal buffer is scaled by devicePixelRatio above.
      style={{ width, height }}
      className="absolute inset-0"
    />
  );
}

// ════════════════════════════════════════════════════════════
// DRAWING HELPERS (pure functions, no side effects)
// ════════════════════════════════════════════════════════════

/**
 * Draw subtle pitch markings so the canvas doesn't look like
 * a blank green rectangle. These are cosmetic only.
 */
function drawPitchMarkings(ctx, w, h) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;

  // Halfway line
  const midX = w / 2;
  ctx.beginPath();
  ctx.moveTo(midX, 0);
  ctx.lineTo(midX, h);
  ctx.stroke();

  // Center circle (radius ~9.15m on a 120m pitch → 7.6% of width)
  const centerRadius = w * 0.076;
  ctx.beginPath();
  ctx.arc(midX, h / 2, centerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(midX, h / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Penalty areas (approximate proportions)
  // Left penalty area
  const penW = w * 0.138; // ~16.5m / 120m
  const penH = h * 0.513; // ~41m / 80m
  const penY = (h - penH) / 2;
  ctx.strokeRect(0, penY, penW, penH);

  // Right penalty area
  ctx.strokeRect(w - penW, penY, penW, penH);

  // Outer border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

/**
 * Render density heatmap using native Canvas radial gradients and additive blending.
 *
 * Safety: Ignores events without valid startPx/startPy coordinates.
 * State Management: Ensures globalCompositeOperation and globalAlpha are reset to defaults.
 */
function drawHeatmap(ctx, events) {
  if (!events || events.length === 0) return;

  // Save context state before changing blend modes
  ctx.save();

  // Set blend mode to 'lighter' for additive color accumulation
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1.0;

  const radius = 25; // 25px radius gradient per event point

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Safety checks: skip events with missing or invalid start coordinates
    if (
      event.startPx == null ||
      event.startPy == null ||
      isNaN(event.startPx) ||
      isNaN(event.startPy)
    ) {
      continue;
    }

    const x = event.startPx;
    const y = event.startPy;

    // Create radial gradient centered at (x, y)
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255, 50, 0, 0.05)');   // Hot red core with low opacity
    gradient.addColorStop(0.5, 'rgba(255, 120, 0, 0.02)'); // Warm orange transition
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');    // Fully transparent outer edge

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Restore context state to prevent affecting subsequent draw operations
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
}

/**
 * Render pass events as thin, semi-transparent lines.
 *
 * For performance on large datasets (1000+ passes), we batch
 * all lines into a single path and stroke once, rather than
 * calling stroke() per line.
 */
function drawPasses(ctx, passes) {
  if (passes.length === 0) return;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 0.6;

  ctx.beginPath();
  for (let i = 0; i < passes.length; i++) {
    const p = passes[i];
    
    // Safety check for pass line coordinates
    if (
      p.startPx == null || p.startPy == null || p.endPx == null || p.endPy == null ||
      isNaN(p.startPx) || isNaN(p.startPy) || isNaN(p.endPx) || isNaN(p.endPy)
    ) {
      continue;
    }

    ctx.moveTo(p.startPx, p.startPy);
    ctx.lineTo(p.endPx, p.endPy);
  }
  ctx.stroke();
}

/**
 * Render shot events as circles whose radius scales with xG.
 *
 * Visual encoding:
 *   - Radius: 4px base + (xG * 16px), so a tap-in (xG=0.9)
 *     gets a large 18px circle and a long shot (xG=0.03) gets ~4.5px.
 *   - Color: Goals are gold, missed shots are crimson with
 *     opacity proportional to xG for subtle emphasis.
 *   - Stroke: A thin white outline for visibility against the
 *     green pitch background.
 *
 * Safety: Handles missing/null xG and is_goal gracefully.
 */
function drawShots(ctx, shots) {
  if (shots.length === 0) return;

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];

    // Safety check for shot coordinates
    if (
      shot.startPx == null || shot.startPy == null ||
      isNaN(shot.startPx) || isNaN(shot.startPy)
    ) {
      continue;
    }

    // Safe xG: default to 0.05 if missing/null/NaN
    const xg = (shot.xg != null && !isNaN(shot.xg)) ? shot.xg : 0.05;

    // Radius scales with xG: min 4px, max ~20px
    const radius = 4 + xg * 16;

    // is_goal may be missing (undefined/null), treat as false
    const isGoal = shot.is_goal === true;

    // ── Fill color ────────────────────────────────────────
    if (isGoal) {
      // Gold with high opacity for confirmed goals
      ctx.fillStyle = `rgba(255, 215, 0, ${0.7 + xg * 0.3})`;
    } else {
      // Crimson with opacity scaling by xG (big chance = more visible)
      ctx.fillStyle = `rgba(220, 38, 38, ${0.3 + xg * 0.5})`;
    }

    ctx.beginPath();
    ctx.arc(shot.startPx, shot.startPy, radius, 0, Math.PI * 2);
    ctx.fill();

    // ── Stroke outline ────────────────────────────────────
    ctx.strokeStyle = isGoal
      ? 'rgba(255, 255, 255, 0.9)'
      : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = isGoal ? 1.5 : 0.8;
    ctx.stroke();
  }
}
