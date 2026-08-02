// ============================================
// src/hooks/usePlayerProfile.js
// ============================================
// Hook to fetch and manage player profile data including
// statistics and transfers across seasons.
// ============================================

import { useState, useCallback, useMemo } from 'react';
import { useApi } from './useApi';

export function usePlayerProfile(playerId, initialSeason) {
  const currentYear = 2024; // Default to 2024 since it is seeded in DB and avoids API limits
  const [season, setSeason] = useState(initialSeason || currentYear);

  const { data, loading, error, isQuotaExhausted, refetch } = useApi(
    playerId ? `/football/players/${playerId}?season=${season}` : null,
    { playerId, season }
  );

  const changeSeason = useCallback((newSeason) => {
    setSeason(parseInt(newSeason, 10));
  }, []);

  const formattedData = useMemo(() => {
    if (!data) return null;
    return {
      player: data.player || null,
      statistics: data.statistics || [],
      transfers: data.transfers || [],
      season: data.season || season,
    };
  }, [data, season]);

  return {
    data: formattedData,
    loading,
    error,
    isQuotaExhausted,
    season,
    changeSeason,
    refetch,
  };
}
