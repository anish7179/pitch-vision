// ============================================
// src/components/SpatialPitchContainer.jsx
// ============================================
// Container component that wires spatial data to the pitch renderer.
//
// ARCHITECTURE — Container/Presentational Pattern:
// This component owns:
//   1. The data (via useSpatialData hook)
//   2. The container ref (for measuring pixel dimensions)
//   3. The coordinate scaling (via pitchScaler utility)
//   4. The filter UI controls
//
// It does NOT own the rendering logic (D3/Canvas). Instead, it passes
// fully scaled coordinates as clean props to a pure rendering child.
// This separation means the renderer can be swapped (SVG → Canvas → WebGL)
// without touching the data layer.
//
// INTERVIEW CONCEPT — ResizeObserver:
// We use ResizeObserver instead of window.onresize because:
//   - It fires when the *element* resizes, not just the window
//   - It handles CSS-driven layout changes (e.g., sidebar collapse)
//   - It's more performant (no debounce needed for most cases)
// ============================================

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useSpatialData, EVENT_FILTERS } from '../hooks/useSpatialData';
import { scaleAllEvents } from '../utils/pitchScaler';
import { Activity, Filter } from 'lucide-react';
import PitchRenderer from './PitchRenderer';

// Anish Dhananjay Pawar (23BCE11329)

export default function SpatialPitchContainer({ matchId, filterPlayerId = null }) {
  // ── Ref to the pitch container element ────────────────────
  const containerRef = useRef(null);

  // ── Container dimensions (updated by ResizeObserver) ──────
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // ── Spatial data hook ─────────────────────────────────────
  const {
    filteredEvents,
    loading,
    error,
    eventCount,
    uniqueTeams,
    activeFilter,
    setActiveFilter,
    teamFilter,
    setTeamFilter,
  } = useSpatialData(matchId, filterPlayerId);

  // ── ResizeObserver: track container pixel dimensions ──────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(el);

    // Set initial dimensions
    setDimensions({
      width: el.clientWidth,
      height: el.clientHeight,
    });

    return () => observer.disconnect();
  }, []);

  // ── Scale coordinates to pixel space ──────────────────────
  // useMemo ensures we only re-scale when the source data or
  // container dimensions actually change, not on every render.
  const scaledEvents = useMemo(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return [];
    return scaleAllEvents(filteredEvents, dimensions.width, dimensions.height);
  }, [filteredEvents, dimensions.width, dimensions.height]);

  // ── Filter button configuration ───────────────────────────
  const filterButtons = [
    { key: EVENT_FILTERS.ALL, label: 'All Events' },
    { key: EVENT_FILTERS.PASS, label: 'Passes' },
    { key: EVENT_FILTERS.SHOT, label: 'Shots' },
    { key: EVENT_FILTERS.HEATMAP, label: 'Heatmap' },
  ];

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-display font-bold uppercase tracking-widest text-sm">
          Loading Spatial Data...
        </p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-100 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8 text-center">
        <Activity className="text-red-500 mb-4" size={48} />
        <p className="text-red-500 font-display font-bold uppercase tracking-widest text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Filter Controls ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Event Type Filter */}
        <div className="flex gap-4 bg-gray-100 dark:bg-zinc-800 p-2 rounded-xl">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setActiveFilter(btn.key)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-colors ${
                activeFilter === btn.key
                  ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Team Filter (Hidden if filtering by specific player) */}
        {!filterPlayerId && uniqueTeams.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-500" />
            <select
              value={teamFilter || ''}
              onChange={(e) => setTeamFilter(e.target.value || null)}
              className="appearance-none bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-display font-bold uppercase tracking-widest px-3 py-1.5 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
            >
              <option value="">All Teams</option>
              {uniqueTeams.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
        )}

        {/* Event Count Badge */}
        <span className="ml-auto text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest">
          {eventCount.toLocaleString()} events
        </span>
      </div>

      {/* ── Pitch Container ─────────────────────────────────── */}
      {/* 
        This div is the measured container. Its pixel dimensions
        are tracked by ResizeObserver and used to scale all
        backend coordinates into visual pixel positions.
        
        The aspect ratio is locked to 3:2 (120:80) via the
        aspect-ratio CSS property, ensuring the pitch scales
        proportionally on any screen size.
      */}
      <div
        ref={containerRef}
        className="w-full bg-[#1a472a] rounded-xl overflow-hidden shadow-inner border border-green-900/50 relative"
        style={{ aspectRatio: '120 / 80' }}
      >
        {scaledEvents.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Activity className="text-green-400/30 mb-3" size={48} />
            <p className="text-green-400/50 font-display font-bold uppercase tracking-widest text-sm">
              No events to display
            </p>
          </div>
        ) : (
          <PitchRenderer
            events={scaledEvents}
            width={dimensions.width}
            height={dimensions.height}
            renderMode={activeFilter === EVENT_FILTERS.HEATMAP ? 'heatmap' : 'events'}
          />
        )}
      </div>
    </div>
  );
}
