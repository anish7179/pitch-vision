// ============================================
// src/utils/pitchScaler.js
// ============================================
// Coordinate Scaling Engine for PitchVision.
//
// The backend returns spatial coordinates on a strict 120x80 axis
// (StatsBomb standard pitch dimensions). This utility maps those
// raw coordinates onto the pixel dimensions of the frontend
// pitch container, so that X: 60 always lands at the visual
// center regardless of the container's aspect ratio or resize state.
//
// INTERVIEW CONCEPT — Pure Function:
// This module exports pure functions with zero side effects.
// Given the same inputs, they always produce the same outputs,
// making them trivially testable and safe to call from any
// component or worker thread.
// ============================================

// Backend pitch dimensions (StatsBomb standard)
const PITCH_LENGTH = 120; // X-axis: 0 → 120
const PITCH_WIDTH = 80;   // Y-axis: 0 → 80

/**
 * Scale a single (x, y) coordinate from backend pitch space
 * to the pixel dimensions of the frontend container.
 *
 * @param {number} x - Backend X coordinate (0–120)
 * @param {number} y - Backend Y coordinate (0–80)
 * @param {number} containerWidth  - Current clientWidth of the pitch container (px)
 * @param {number} containerHeight - Current clientHeight of the pitch container (px)
 * @returns {{ px: number, py: number }} Scaled pixel coordinates
 */
export function scaleCoordinate(x, y, containerWidth, containerHeight) {
  return {
    px: (x / PITCH_LENGTH) * containerWidth,
    py: (y / PITCH_WIDTH) * containerHeight,
  };
}

/**
 * Scale a complete event object (with start and end coordinates)
 * to the pixel dimensions of the frontend container.
 *
 * @param {object} event - A spatial event with start_x, start_y, end_x, end_y
 * @param {number} containerWidth  - Current clientWidth (px)
 * @param {number} containerHeight - Current clientHeight (px)
 * @returns {object} The original event augmented with scaled pixel coords
 */
export function scaleEvent(event, containerWidth, containerHeight) {
  const start = scaleCoordinate(event.start_x, event.start_y, containerWidth, containerHeight);
  const end = scaleCoordinate(
    event.end_x ?? event.start_x,
    event.end_y ?? event.start_y,
    containerWidth,
    containerHeight
  );

  return {
    ...event,
    startPx: start.px,
    startPy: start.py,
    endPx: end.px,
    endPy: end.py,
  };
}

/**
 * Batch-scale an entire array of events.
 * Optimised for large datasets (100K+ events) by avoiding
 * intermediate object allocations where possible.
 *
 * @param {Array} events - Array of spatial event objects
 * @param {number} containerWidth  - Current clientWidth (px)
 * @param {number} containerHeight - Current clientHeight (px)
 * @returns {Array} New array of events with pixel coordinates appended
 */
export function scaleAllEvents(events, containerWidth, containerHeight) {
  if (!events || events.length === 0) return [];

  // Pre-compute the scale factors once instead of dividing per-event
  const scaleX = containerWidth / PITCH_LENGTH;
  const scaleY = containerHeight / PITCH_WIDTH;

  return events.map((event) => ({
    ...event,
    startPx: event.start_x * scaleX,
    startPy: event.start_y * scaleY,
    endPx: (event.end_x ?? event.start_x) * scaleX,
    endPy: (event.end_y ?? event.start_y) * scaleY,
  }));
}

export { PITCH_LENGTH, PITCH_WIDTH };
