// ============================================
// src/hooks/useSpatialData.js
// ============================================
// Custom hook for fetching, caching, and filtering spatial event data.
//
// ARCHITECTURE:
// Composes on top of the project's existing `useApi` hook to inherit
// its loading/error/quota-exhausted state machine, then layers on
// spatial-specific concerns: event type filtering, team filtering,
// and container-aware coordinate scaling.
//
// INTERVIEW CONCEPT — Derived State:
// Instead of storing filtered results in separate state (which
// causes stale bugs), we derive them with useMemo from the
// canonical `data` + `activeFilter`. This guarantees the filtered
// view is always in sync with the source of truth.
// ============================================

import { useState, useMemo, useCallback } from 'react';
import { useApi } from './useApi';

// Available event type filters for the UI toggle bar
export const EVENT_FILTERS = {
  ALL: 'All',
  PASS: 'Pass',
  SHOT: 'Shot',
  HEATMAP: 'Heatmap',
};

/**
 * Custom hook for spatial event data.
 *
 * @param {string|null} matchId - The match ID to fetch spatial data for.
 *                                Pass null to skip fetching.
 * @returns {{
 *   events: Array,           - Raw unscaled events from the API
 *   filteredEvents: Array,   - Events filtered by the active event type
 *   loading: boolean,
 *   error: string|null,
 *   activeFilter: string,    - Currently active event type filter
 *   setActiveFilter: Function,
 *   teamFilter: string|null, - Currently active team filter
 *   setTeamFilter: Function,
 *   eventCount: number,      - Total count of filtered events
 *   uniqueTeams: Array,      - Unique team names extracted from the data
 *   refetch: Function,
 * }}
 */
export function useSpatialData(matchId) {
  // ── Filter State ──────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState(EVENT_FILTERS.ALL);
  const [teamFilter, setTeamFilter] = useState(null);

  // ── Data Fetching ─────────────────────────────────────────
  // Compose on useApi. The URL is null when matchId is absent,
  // which tells useApi to skip the fetch entirely.
  const url = matchId ? `/spatial/match/${matchId}` : null;
  const { data, loading, error, refetch } = useApi(url, { matchId });

  // ── Derived: Raw events array ─────────────────────────────
  // The API returns { success, count, data: [...] }.
  // useApi already unwraps `response.data.data` when `success` is true,
  // so `data` here is the raw array of event objects.
  const events = useMemo(() => {
    if (!data) return [];
    // Handle both unwrapped array and wrapped { data: [...] } shapes
    return Array.isArray(data) ? data : (data.data ?? []);
  }, [data]);

  // ── Derived: Unique team names ────────────────────────────
  // Extracted once from the full dataset so the UI can render
  // a team toggle without a separate API call.
  const uniqueTeams = useMemo(() => {
    const teamSet = new Set(events.map((e) => e.team).filter(Boolean));
    return Array.from(teamSet);
  }, [events]);

  // ── Derived: Filtered events ──────────────────────────────
  // Computed from the canonical events array + active filters.
  // No separate state needed — this is always in sync.
  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter by event type (Pass, Shot, etc.) unless ALL or HEATMAP mode is selected
    if (activeFilter !== EVENT_FILTERS.ALL && activeFilter !== EVENT_FILTERS.HEATMAP) {
      result = result.filter((e) => e.event_type === activeFilter);
    }

    // Filter by team
    if (teamFilter) {
      result = result.filter((e) => e.team === teamFilter);
    }

    return result;
  }, [events, activeFilter, teamFilter]);

  // ── Reset filters when match changes ──────────────────────
  const resetFilters = useCallback(() => {
    setActiveFilter(EVENT_FILTERS.ALL);
    setTeamFilter(null);
  }, []);

  return {
    // Data
    events,
    filteredEvents,
    eventCount: filteredEvents.length,
    uniqueTeams,

    // Loading / Error
    loading,
    error,

    // Filters
    activeFilter,
    setActiveFilter,
    teamFilter,
    setTeamFilter,
    resetFilters,

    // Actions
    refetch,
  };
}
