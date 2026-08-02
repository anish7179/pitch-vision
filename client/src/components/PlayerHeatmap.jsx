import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

export default function PlayerHeatmap({ matchId, playerId, viewState = 'heatmap' }) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [matchId, playerId, viewState]);

  // Use a cache-buster so cached 404s don't falsely trigger onError
  const timestamp = Date.now();
  let imageUrl = `http://localhost:8000/api/heatmap/${matchId}/${playerId}?t=${timestamp}`;
  if (viewState === 'xgmap') {
    imageUrl = `http://localhost:8000/api/xgmap/${matchId}/${playerId}?t=${timestamp}`;
  } else if (viewState === 'passnetwork') {
    imageUrl = `http://localhost:8000/api/passnetwork/${matchId}/${playerId}?t=${timestamp}`;
  }

  const renderFallbackText = () => {
    if (viewState === 'xgmap') return 'No Shots Recorded';
    if (viewState === 'passnetwork') return 'No Passes Recorded';
    return 'No Spatial Data Available';
  };

  const renderFallbackDesc = () => {
    if (viewState === 'xgmap') return 'No shot coordinates are available for this player in this match.';
    if (viewState === 'passnetwork') return 'No pass coordinates are available for this player in this match.';
    return 'Match events coordinates are not available for this player in this match.';
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Image Container */}
      <div className="w-full h-full relative rounded-xl overflow-hidden bg-[#1e1e1e] shadow-inner border border-gray-200 dark:border-zinc-800 flex items-center justify-center min-h-75">
        {hasError ? (
          <div className="flex flex-col items-center justify-center p-8">
            <Activity className="text-gray-400 dark:text-zinc-600 mb-4" size={48} />
            <p className="text-gray-500 dark:text-zinc-400 font-display font-bold uppercase tracking-widest text-sm text-center">
              {renderFallbackText()}
            </p>
            <p className="text-gray-400 dark:text-zinc-500 text-xs text-center mt-2 max-w-xs">
              {renderFallbackDesc()}
            </p>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] z-10">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: isLoading ? 0 : 1, scale: isLoading ? 0.95 : 1 }}
              transition={{ duration: 0.5 }}
              src={imageUrl}
              alt={`${viewState} for player ${playerId} in match ${matchId}`}
              className="w-full h-auto object-contain z-0"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
