import React from 'react';
import SpatialPitchContainer from './SpatialPitchContainer';
import { X } from 'lucide-react';

const PlayerSpatialModal = ({ selectedPlayer, matchId, onClose }) => {
  if (!selectedPlayer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-(--bg-panel) border border-(--border-subtle) rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-(--border-subtle) bg-(--bg-secondary)">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-(--color-brand) flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {selectedPlayer.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-(--text-main)">{selectedPlayer.name}</h2>
              <div className="flex gap-3 text-sm text-(--text-muted)">
                <span>Rating: {selectedPlayer.rating ? selectedPlayer.rating.toFixed(1) : 'N/A'}</span>
                {selectedPlayer.isSubbedOn && <span className="text-green-500">Subbed On</span>}
                {selectedPlayer.isSubbedOff && <span className="text-red-500">Subbed Off</span>}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full text-(--text-muted) hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Stats Sidebar Placeholder */}
          <div className="w-full lg:w-80 border-r border-(--border-subtle) bg-(--bg-panel) p-4 overflow-y-auto">
            <h3 className="text-lg font-bold text-(--text-main) mb-4 uppercase tracking-wider">Match Stats</h3>
            
            <div className="space-y-4">
              <div className="bg-(--bg-secondary) p-3 rounded-lg border border-(--border-subtle)">
                <div className="text-xs text-(--text-muted) uppercase">Passes</div>
                <div className="text-2xl font-bold text-(--text-main)">--</div>
              </div>
              <div className="bg-(--bg-secondary) p-3 rounded-lg border border-(--border-subtle)">
                <div className="text-xs text-(--text-muted) uppercase">Shots</div>
                <div className="text-2xl font-bold text-(--text-main)">--</div>
              </div>
              <div className="bg-(--bg-secondary) p-3 rounded-lg border border-(--border-subtle)">
                <div className="text-xs text-(--text-muted) uppercase">Expected Goals (xG)</div>
                <div className="text-2xl font-bold text-(--text-main)">--</div>
              </div>
              <div className="bg-(--bg-secondary) p-3 rounded-lg border border-(--border-subtle)">
                <div className="text-xs text-(--text-muted) uppercase">Distance Covered</div>
                <div className="text-2xl font-bold text-(--text-main)">--</div>
              </div>
            </div>
          </div>

          {/* Spatial Pitch Area */}
          <div className="flex-1 bg-zinc-950 p-4 relative overflow-hidden flex flex-col">
            <h3 className="text-sm font-bold text-zinc-400 mb-2 uppercase tracking-wider">Spatial Activity Map</h3>
            <div className="flex-1 rounded-xl overflow-hidden border border-zinc-800 relative">
              <SpatialPitchContainer 
                matchId={matchId} 
                filterPlayerId={selectedPlayer.id} 
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlayerSpatialModal;
