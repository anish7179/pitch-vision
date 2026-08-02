// ============================================
// src/hooks/useComparison.js
// ============================================
// Hook to manage player selection state for the Head-to-Head
// comparison feature. Enforces business rules (min 2, max 4 players).
// ============================================

import { useState, useCallback } from 'react';

export function useComparison(maxPlayers = 4, minPlayers = 2) {
  const [selectedPlayers, setSelectedPlayers] = useState([]);

  const isFull = selectedPlayers.length >= maxPlayers;
  const canCompare = selectedPlayers.length >= minPlayers;

  const isSelected = useCallback(
    (playerId) => selectedPlayers.some((p) => p.id === playerId),
    [selectedPlayers]
  );

  const togglePlayer = useCallback(
    (player) => {
      setSelectedPlayers((prev) => {
        const exists = prev.some((p) => p.id === player.id);
        if (exists) {
          // Remove player
          return prev.filter((p) => p.id !== player.id);
        } else {
          // Add player if not full
          if (prev.length >= maxPlayers) return prev;
          return [...prev, player];
        }
      });
    },
    [maxPlayers]
  );

  const removePlayer = useCallback((playerId) => {
    setSelectedPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedPlayers([]);
  }, []);

  return {
    selectedPlayers,
    isFull,
    canCompare,
    isSelected,
    togglePlayer,
    removePlayer,
    clearAll,
  };
}
