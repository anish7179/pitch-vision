// ============================================
// src/hooks/useTeamData.js
// ============================================
// Hook to fetch and manage team profile data including
// squads, standings, and fixtures across different seasons.
// ============================================

import { useState, useCallback, useMemo } from 'react';
import { useApi } from './useApi';

export function useTeamData(teamId, initialSeason) {
  const currentYear = 2024; // Default to 2024 since it is seeded in DB and avoids API limits
  const [season, setSeason] = useState(initialSeason || currentYear);

  // useApi handles the actual fetch, loading state, and error handling.
  // It automatically refetches when teamId or season changes because we pass
  // them as dependencies.
  const { data, loading, error, isQuotaExhausted, refetch } = useApi(
    teamId ? `/football/teams/${teamId}?season=${season}` : null,
    { teamId, season }
  );

  const changeSeason = useCallback((newSeason) => {
    setSeason(parseInt(newSeason, 10));
  }, []);

  // Format the returned data to ensure robust fallbacks
  const formattedData = useMemo(() => {
    if (!data) return null;
    return {
      team: data.team || null,
      squad: data.squad || [],
      standings: data.standings || [],
      recentFixtures: data.recentFixtures || [],
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
