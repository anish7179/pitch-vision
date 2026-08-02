import React from 'react';
import PlayerNode from './PlayerNode';

const TacticalLineup = ({ matchData, matchId, onPlayerClick, isSelected }) => {
  if (!matchData || !matchData.lineups) return null;

  // Backend sends snake_case: home_team, away_team
  const homeTeam = matchData.home_team;
  const awayTeam = matchData.away_team;
  const { lineups } = matchData;
  const homeLineup = lineups.home || [];
  const awayLineup = lineups.away || [];

  const homeStarters = homeLineup.filter(p => !p.isBench);
  const awayStarters = awayLineup.filter(p => !p.isBench);
  
  const homeBench = homeLineup.filter(p => p.isBench);
  const awayBench = awayLineup.filter(p => p.isBench);

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto p-4 gap-6">
      {/* Pitch UI */}
      <div className="relative w-full mx-auto bg-green-700 rounded-xl overflow-hidden border-4 border-white/20 shadow-2xl" style={{ aspectRatio: '3 / 4' }}>
        {/* Pitch markings */}
        <div className="absolute inset-0 border-2 border-white/30 m-4 rounded" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/5 h-[14%] border-2 border-t-0 border-white/30" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/5 h-[14%] border-2 border-b-0 border-white/30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/5 h-[6%] border-2 border-t-0 border-white/30" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/5 h-[6%] border-2 border-b-0 border-white/30" />
        <div className="absolute top-1/2 left-0 w-full border border-white/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 border-2 border-white/30 rounded-full" />
        
        {/* Home Team (Top half) */}
        <div className="absolute top-0 left-0 w-full h-1/2 grid grid-rows-5 grid-cols-5 p-2 md:p-4 z-10">
          {homeStarters.map(player => (
            <div key={player.id} className={`flex items-center justify-center ${player.gridPosition || ''}`}>
              <PlayerNode player={player} onClick={onPlayerClick} isSelected={isSelected && isSelected(player.id)} />
            </div>
          ))}
        </div>

        {/* Away Team (Bottom half) */}
        <div className="absolute bottom-0 left-0 w-full h-1/2 grid grid-rows-5 grid-cols-5 p-2 md:p-4 z-10">
          {awayStarters.map(player => (
            <div key={player.id} className={`flex items-center justify-center ${player.gridPosition || ''}`}>
              <PlayerNode player={player} onClick={onPlayerClick} isSelected={isSelected && isSelected(player.id)} />
            </div>
          ))}
        </div>

        {/* Team Labels */}
        <div className="absolute top-2 left-4 z-20 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg">
          <span className="text-white text-xs font-bold uppercase tracking-widest">{homeTeam}</span>
        </div>
        <div className="absolute bottom-2 right-4 z-20 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg">
          <span className="text-white text-xs font-bold uppercase tracking-widest">{awayTeam}</span>
        </div>
      </div>

      {/* Bench Section */}
      {(homeBench.length > 0 || awayBench.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle)]">
          <div>
            <h4 className="text-[var(--text-main)] font-bold mb-2 border-b border-[var(--border-subtle)] pb-1">{homeTeam} Bench</h4>
            <div className="flex flex-wrap gap-2">
              {homeBench.map(p => (
                 <div key={p.id} onClick={() => onPlayerClick && onPlayerClick(p)} className={`text-sm cursor-pointer px-2 py-1 rounded transition-colors ${isSelected && isSelected(p.id) ? 'bg-blue-500 text-white' : 'text-[var(--text-muted)] bg-[var(--bg-secondary)] hover:text-white'}`}>
                   {p.name}
                 </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[var(--text-main)] font-bold mb-2 border-b border-[var(--border-subtle)] pb-1">{awayTeam} Bench</h4>
            <div className="flex flex-wrap gap-2">
              {awayBench.map(p => (
                 <div key={p.id} onClick={() => onPlayerClick && onPlayerClick(p)} className={`text-sm cursor-pointer px-2 py-1 rounded transition-colors ${isSelected && isSelected(p.id) ? 'bg-red-500 text-white' : 'text-[var(--text-muted)] bg-[var(--bg-secondary)] hover:text-white'}`}>
                   {p.name}
                 </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticalLineup;
