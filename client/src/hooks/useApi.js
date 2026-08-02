// ============================================
// src/hooks/useApi.js
// ============================================
// Low-level generic fetch hook that all domain hooks compose from.
//
// INTERVIEW CONCEPT — Composition over Inheritance:
// Instead of each hook duplicating loading/error/fetch logic,
// we extract the common pattern into useApi and let domain hooks
// (useTeamData, usePlayerProfile) build on top of it.
//
// This is the "Composition" pattern — small, focused hooks
// composed together — which React explicitly recommends over
// class-based inheritance hierarchies.
//
// QUOTA EXHAUSTED DETECTION:
// When the backend returns HTTP 429, we set a specific
// `isQuotaExhausted` flag. The UI can render a graceful
// "come back tomorrow" message instead of a generic error.
// ============================================

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/axios';

/**
 * Generic API fetch hook.
 *
 * @param {string|null} url      - The API endpoint to fetch (relative to API_BASE).
 *                                  Pass null to skip fetching.
 * @param {object}      [deps]   - Dependencies that trigger a re-fetch when changed.
 *
 * @returns {{
 *   data: any,
 *   loading: boolean,
 *   error: string|null,
 *   isQuotaExhausted: boolean,
 *   refetch: () => void
 * }}
 */
export function useApi(url, deps = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState(null);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);

  // Serialize deps to a stable string for useEffect dependency
  const depsKey = JSON.stringify(deps);

  const fetchData = useCallback(async () => {
    if (!url) return;

    setLoading(true);
    setError(null);
    setIsQuotaExhausted(false);

    try {
      const response = await apiClient.get(url);

      if (response.data?.success) {
        setData(response.data.data);
      } else {
        setData(response.data);
      }
    } catch (err) {
      const status = err.response?.status;
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        'An unexpected error occurred';

      if (status === 429) {
        setIsQuotaExhausted(true);
        setError('API quota exhausted for today. Data will refresh tomorrow.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, depsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, isQuotaExhausted, refetch: fetchData };
}
