import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { Activity, Users, BarChart3, ArrowLeftRight, Clock, Plus, Shield, User, CheckSquare, Square, ChevronRight } from 'lucide-react';
import MagicCard from '../components/ui/MagicCard';
import { useComparison } from '../hooks/useComparison';
import SpatialPitchContainer from '../components/SpatialPitchContainer';
import TacticalLineup from '../components/TacticalLineup';
import { useApi } from '../hooks/useApi';

export default function MatchDetail() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('TIMELINE');
  
  // Fetch dynamic match metadata
  const { data: matchMeta } = useApi(`/spatial/match/${id}/meta`);
  const homeTeam = matchMeta?.home_team || 'Home Team';
  const awayTeam = matchMeta?.away_team || 'Away Team';
  const matchDate = matchMeta?.date || 'Date TBD';

  // Compare Hook Setup
  const {
    selectedPlayers,
    isFull,
    canCompare,
    isSelected,
    togglePlayer,
    removePlayer,
    clearAll,
  } = useComparison(4, 2);

  // ── Socket.io Real-Time Updates ────────────────────────────────
  const { joinMatch, leaveMatch, useSocketEvent } = useSocket();
  const [liveScore, setLiveScore] = useState({ home: 0, away: 0 });

  useEffect(() => {
    if (matchMeta?.score) {
      setLiveScore(matchMeta.score);
    }
  }, [matchMeta?.score]);

  useEffect(() => {
    joinMatch(id);
    return () => leaveMatch(id);
  }, [id, joinMatch, leaveMatch]);

  useSocketEvent('match:scoreUpdate', (data) => {
    if (data.matchId === parseInt(id, 10)) {
      setLiveScore({ home: data.goals.home, away: data.goals.away });
    }
  });
  // ───────────────────────────────────────────────────────────────

  const stats = matchMeta?.stats || [];
  const timeline = matchMeta?.timeline || [];



  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants}
      className="w-full flex flex-col p-4 md:p-8 lg:p-12 font-sans"
    >
      
      {/* Scoreboard Header */}
      <motion.div variants={itemVariants} className="w-full bg-(--bg-panel) border border-(--border-subtle) rounded-3xl px-6 py-12 mb-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-center">
        {/* Subtle Accent Glows */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>

        <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-2 bg-(--bg-secondary) border border-(--border-subtle) px-4 py-1.5 rounded-full mb-8 shadow-sm">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-(--text-main) uppercase tracking-widest">{matchDate} • {homeTeam} vs {awayTeam}</span>
            </div>
            
            <div className="flex justify-center items-center gap-8 lg:gap-20 w-full max-w-4xl">
              {/* Home Team */}
              <div className="flex flex-col items-center gap-6 w-1/3 group">
                <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-3xl bg-(--bg-secondary) border border-(--border-subtle) flex items-center justify-center group-hover:border-blue-500/50 transition-colors shadow-inner overflow-hidden relative">
                   <div className="absolute inset-0 bg-linear-to-tr from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   <Shield size={48} className="text-(--text-muted) group-hover:text-blue-500 transition-colors relative z-10" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-display font-black text-(--text-main) uppercase text-center tracking-tight group-hover:text-blue-500 transition-colors">{homeTeam}</h2>
              </div>
            
            {/* Score Center */}
            <div className="flex flex-col items-center gap-4">
              <span className="text-xs font-bold text-(--color-brand) uppercase tracking-widest bg-(--color-brand)/10 px-4 py-1.5 rounded-full border border-(--color-brand)/20">Full Time</span>
              <span className="text-6xl lg:text-8xl font-display font-black text-(--color-brand) tracking-tighter tabular-nums drop-shadow-md">
                {liveScore.home} - {liveScore.away}
              </span>
              <span className="text-sm font-bold text-(--text-muted) tracking-widest uppercase">{matchDate}</span>
            </div>

              {/* Away Team */}
              <div className="flex flex-col items-center gap-6 w-1/3 group">
                <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-3xl bg-(--bg-secondary) border border-(--border-subtle) flex items-center justify-center group-hover:border-red-500/50 transition-colors shadow-inner overflow-hidden relative">
                   <div className="absolute inset-0 bg-linear-to-tr from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   <Shield size={48} className="text-(--text-muted) group-hover:text-red-500 transition-colors relative z-10" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-display font-black text-(--text-main) uppercase text-center tracking-tight group-hover:text-red-500 transition-colors">{awayTeam}</h2>
              </div>
            </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="w-full bg-(--bg-panel) border border-(--border-subtle) rounded-2xl p-2 mb-8 flex overflow-x-auto no-scrollbar shadow-sm sticky top-0 md:top-24 z-40">
        {[
          { id: 'TIMELINE', icon: <Clock size={18} /> },
          { id: 'LINEUPS & SQUADS', icon: <Users size={18} /> },
          { id: 'STATISTICS', icon: <BarChart3 size={18} /> },
          { id: 'COMPARE PLAYERS', icon: <ArrowLeftRight size={18} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-(--color-brand) text-white shadow-md' 
                : 'text-(--text-muted) hover:text-(--text-main) hover:bg-(--bg-secondary)'
            }`}
          >
            {tab.icon}
            {tab.id}
          </button>
        ))}
      </motion.div>

      {/* Content Area */}
      <motion.div variants={itemVariants} className="w-full grow">
        <AnimatePresence mode="wait">
          
          {/* TIMELINE TAB */}
          {activeTab === 'TIMELINE' && (
            <motion.div 
              key="timeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto flex flex-col gap-6 w-full px-2"
            >
              <div className="relative ml-4 md:ml-8 flex flex-col gap-10">
                {/* Vertical Timeline Line */}
                <div className="absolute top-4 bottom-4 left-5.5 w-0.5 bg-linear-to-b from-transparent via-(--border-subtle) to-transparent opacity-50"></div>

                {timeline.length === 0 ? (
                  <div className="text-center text-(--text-muted) py-12">No timeline events recorded.</div>
                ) : timeline.map((log, idx) => (
                  <div key={idx} className="relative flex gap-8 group items-start">
                    <div className="shrink-0 mt-2.5 z-10">
                      <div className={`w-11 h-11 rounded-full border-4 border-(--bg-primary) shadow-[0_0_15px_rgba(0,0,0,0.1)] flex items-center justify-center text-white transition-transform group-hover:scale-110 ${
                        log.type === 'positive' ? 'bg-blue-500' : 
                        log.type === 'negative' ? 'bg-red-500' : 
                        log.type === 'warning' ? 'bg-yellow-500' :
                        'bg-zinc-500'
                      }`}>
                         {log.type === 'positive' || log.type === 'negative' ? '⚽' : log.type === 'warning' ? '🟨' : '🔄'}
                      </div>
                    </div>
                    
                    <div className="grow bg-linear-to-r from-(--bg-panel) to-transparent border border-(--border-subtle) rounded-2xl p-6 shadow-sm hover:border-(--color-brand)/50 transition-all group-hover:translate-x-2">
                      <div className="flex items-center gap-4 mb-2">
                        <span className={`font-display font-black text-2xl drop-shadow-sm ${
                          log.type === 'positive' ? 'text-blue-500' : 
                          log.type === 'negative' ? 'text-red-500' : 
                          log.type === 'warning' ? 'text-yellow-500' :
                          'text-zinc-500'
                        }`}>
                          {log.time}
                        </span>
                        <h4 className="font-display font-bold text-(--text-main) text-lg tracking-wide uppercase">{log.event}</h4>
                      </div>
                      <p className="text-(--text-muted) font-medium text-sm border-l-2 pl-4 border-zinc-700/50">{log.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* LINEUPS TAB */}
          {activeTab === 'LINEUPS & SQUADS' && (
            <motion.div 
              key="lineups"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full relative"
            >
              <TacticalLineup 
                matchData={matchMeta} 
                matchId={id} 
                onPlayerClick={(player) => !isFull && togglePlayer(player)} 
                isSelected={isSelected} 
              />


              {/* Floating Compare Action Bar */}
              <AnimatePresence>
                {selectedPlayers.length > 0 && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-(--bg-panel)/90 backdrop-blur-lg border border-(--color-brand)/50 rounded-2xl p-4 shadow-2xl flex items-center gap-6"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-(--text-main)">{selectedPlayers.length} / 4 Players Selected</span>
                      <span className="text-xs text-(--text-muted)">{isFull ? 'Maximum reached' : 'Select at least 2 to compare'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={clearAll} className="px-4 py-2 text-sm font-bold text-(--text-muted) hover:text-white transition-colors">
                        Clear
                      </button>
                      <button
                        onClick={() => setActiveTab('COMPARE PLAYERS')}
                        disabled={!canCompare}
                        className={`px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] ${canCompare ? 'bg-(--color-brand) text-white hover:bg-opacity-90 hover:scale-105' : 'bg-(--bg-secondary) text-(--text-muted) cursor-not-allowed opacity-50'}`}
                      >
                        Compare
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* STATISTICS TAB */}
          {activeTab === 'STATISTICS' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto flex flex-col gap-10 w-full"
            >
              <div className="bg-(--bg-panel) border border-(--border-subtle) rounded-3xl p-4 md:p-10 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-75 bg-linear-to-r from-blue-500/5 via-transparent to-red-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex justify-between items-center mb-10 relative z-10">
                  <h3 className="text-3xl font-display font-black text-blue-500 uppercase tracking-tight">{homeTeam}</h3>
                  <div className="bg-(--bg-secondary) p-3 rounded-full border border-(--border-subtle) shadow-sm">
                    <Activity size={24} className="text-(--text-muted)" />
                  </div>
                  <h3 className="text-3xl font-display font-black text-red-500 uppercase tracking-tight">{awayTeam}</h3>
                </div>
                
                <div className="flex flex-col gap-10 relative z-10">
                  {stats.map((stat, i) => (
                    <div key={i} className="flex flex-col gap-4">
                      <div className="flex justify-between items-end text-sm font-bold uppercase tracking-widest">
                        <span className="text-blue-400 font-display text-xl leading-none">{stat.home}</span>
                        <span className="text-(--text-muted) text-[10px] tracking-[0.2em]">{stat.label}</span>
                        <span className="text-red-400 font-display text-xl leading-none">{stat.away}</span>
                      </div>
                      <div className="w-full bg-(--bg-secondary) rounded-full h-4 flex overflow-hidden shadow-inner border border-(--border-subtle)">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${stat.homePct}%` }} 
                          transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.1 }}
                          className="bg-blue-500 h-full rounded-r-md shadow-[0_0_10px_rgba(59,130,246,0.5)] relative overflow-hidden" 
                        >
                           <div className="absolute inset-0 bg-linear-to-r from-transparent to-white/20"></div>
                        </motion.div>
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${stat.awayPct}%` }} 
                          transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.1 }}
                          className="bg-red-500 h-full rounded-l-md shadow-[0_0_10px_rgba(239,68,68,0.5)] relative overflow-hidden" 
                        >
                           <div className="absolute inset-0 bg-linear-to-l from-transparent to-white/20"></div>
                        </motion.div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* COMPARE PLAYERS TAB */}
          {activeTab === 'COMPARE PLAYERS' && (
            <motion.div 
              key="compare"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-8 w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-display font-black text-(--text-main) uppercase tracking-tight">Head-to-Head</h3>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setActiveTab('LINEUPS & SQUADS')}
                    className="flex items-center gap-2 px-4 py-2 bg-(--bg-secondary) border border-(--border-subtle) text-(--text-main) text-sm font-bold rounded-lg hover:border-(--color-brand) transition-colors tracking-widest uppercase shadow-sm"
                  >
                    Manage Players
                  </button>
                  {selectedPlayers.length > 0 && (
                     <button onClick={clearAll} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-lg hover:bg-red-500 hover:text-white transition-colors tracking-widest uppercase shadow-sm">
                       Clear All
                     </button>
                  )}
                </div>
              </div>
              
              <div className={`grid grid-cols-1 md:grid-cols-2 ${selectedPlayers.length > 2 ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-2'} gap-6`}>
                {selectedPlayers.length === 0 ? (
                  <div className="col-span-full py-24 flex flex-col items-center justify-center bg-(--bg-secondary)/50 backdrop-blur-xl rounded-3xl border border-(--border-subtle) shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
                    <User size={64} className="text-(--border-subtle) mb-6 relative z-10" />
                    <h4 className="text-2xl font-display font-black text-(--text-main) uppercase tracking-tight relative z-10">No Players Selected</h4>
                    <p className="text-(--text-muted) mt-3 mb-8 text-center max-w-md font-medium relative z-10">Head back to the Lineups tab and check the boxes next to the players you want to visualize side-by-side.</p>
                    <button 
                      onClick={() => setActiveTab('LINEUPS & SQUADS')}
                      className="relative z-10 px-8 py-3 bg-(--color-brand) text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-opacity-90 hover:-translate-y-0.5 transition-all shadow-[0_10px_20px_rgba(16,185,129,0.3)]"
                    >
                      Select Players
                    </button>
                  </div>
                ) : (
                  selectedPlayers.map((player) => (
                    <div key={player.id} className={`bg-(--bg-panel) border ${player.team === homeTeam ? 'border-blue-500/30' : 'border-red-500/30'} rounded-3xl p-8 shadow-sm flex flex-col items-center min-h-75 relative overflow-hidden group`}>
                      <div className={`absolute top-0 left-0 w-full h-1 ${player.team === homeTeam ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => removePlayer(player.id)} className="text-(--text-muted) hover:text-red-500 flex items-center gap-1">
                           <span className="text-xs uppercase font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md">Remove</span>
                        </button>
                      </div>
                      <div className={`w-24 h-24 bg-(--bg-secondary) rounded-full mb-6 flex items-center justify-center text-(--text-main) shadow-inner border font-display font-black text-4xl ${player.team === homeTeam ? 'border-blue-500/50 text-blue-500' : 'border-red-500/50 text-red-500'}`}>
                        {player.num}
                      </div>
                      <h4 className="font-bold text-xl text-(--text-main) text-center mb-1">{player.name}</h4>
                      <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-md ${player.team === homeTeam ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
                        {player.team}
                      </span>
                      
                      <div className="mt-8 w-full flex flex-col gap-3">
                         <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest"><span className="text-(--text-muted)">Spatial Activity Profile</span><span className="text-(--text-main)">ACTIVE</span></div>
                         <div className="w-full bg-(--bg-secondary) h-1.5 rounded-full overflow-hidden"><div className={`h-full w-[85%] ${player.team === homeTeam ? 'bg-blue-500' : 'bg-red-500'}`}></div></div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-(--bg-panel) border border-(--border-subtle) rounded-3xl p-6 md:p-10 shadow-sm mt-4">
                {selectedPlayers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-75">
                    <BarChart3 size={48} className="text-(--border-subtle) mb-4" />
                    <span className="text-(--color-brand) font-bold uppercase tracking-widest text-sm mb-2">Spatial Engine</span>
                    <p className="text-(--text-muted) font-medium text-center max-w-lg">Select players above to visualize spatial data.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedPlayers.map(player => (
                      <div key={`spatial-${player.id}`} className="flex flex-col bg-black border border-(--border-subtle) rounded-2xl overflow-hidden relative shadow-sm h-[400px]">
                        <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest border border-zinc-800">
                          {player.name} Spatial Heatmap
                        </div>
                        <div className="flex-1 w-full h-full p-0">
                           <SpatialPitchContainer matchId={id} filterPlayerId={player.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </motion.div>
  );
}
