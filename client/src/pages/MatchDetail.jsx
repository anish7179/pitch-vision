import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { Activity, Users, BarChart3, ArrowLeftRight, Clock, Plus, Shield, User, CheckSquare, Square } from 'lucide-react';
import MagicCard from '../components/ui/MagicCard';
import { useComparison } from '../hooks/useComparison';

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
  const [liveScore, setLiveScore] = useState({ home: 2, away: 1 }); // Mock initial score

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

  const stats = [
    { label: 'Possession', home: '62%', away: '38%', homePct: 62, awayPct: 38 },
    { label: 'Shots on Target', home: '8', away: '3', homePct: 72, awayPct: 28 },
    { label: 'Pass Accuracy', home: '89%', away: '76%', homePct: 89, awayPct: 76 },
    { label: 'Corners', home: '4', away: '2', homePct: 66, awayPct: 34 },
    { label: 'Fouls', home: '9', away: '14', homePct: 39, awayPct: 61 },
    { label: 'Yellow Cards', home: '1', away: '2', homePct: 33, awayPct: 67 },
  ];

  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants}
      className="w-full flex flex-col p-6 md:p-12 lg:p-16 font-sans mt-12"
    >
      
      {/* Scoreboard Header */}
      <motion.div variants={itemVariants} className="w-full bg-(--bg-panel) border border-(--border-subtle) rounded-3xl px-6 py-12 mb-8 shadow-sm relative overflow-hidden">
        {/* Subtle Accent Glows */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-2 bg-(--bg-secondary) border border-(--border-subtle) px-4 py-1.5 rounded-full mb-8">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-(--text-main) uppercase tracking-widest">Premier League • Matchday 24</span>
          </div>
          
          <div className="flex justify-center items-center gap-8 lg:gap-20 w-full max-w-4xl">
            {/* Home Team */}
            <div className="flex flex-col items-center gap-6 w-1/3 group">
              <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-2xl bg-(--bg-secondary) border border-(--border-subtle) flex items-center justify-center group-hover:border-blue-500 transition-colors shadow-inner overflow-hidden">
                 <Shield size={48} className="text-(--text-muted)" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-display font-black text-(--text-main) uppercase text-center tracking-tight group-hover:text-blue-500 transition-colors">Man City</h2>
            </div>
            
            {/* Score Center */}
            <div className="flex flex-col items-center gap-4">
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest animate-pulse bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20">87:14</span>
              <span className="text-6xl lg:text-8xl font-display font-black text-(--color-brand) tracking-tighter tabular-nums drop-shadow-md">
                {liveScore.home} - {liveScore.away}
              </span>
              <span className="text-sm font-bold text-(--text-muted) tracking-widest uppercase">2nd Half</span>
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-6 w-1/3 group">
              <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-2xl bg-(--bg-secondary) border border-(--border-subtle) flex items-center justify-center group-hover:border-red-500 transition-colors shadow-inner overflow-hidden">
                 <Shield size={48} className="text-(--text-muted)" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-display font-black text-(--text-main) uppercase text-center tracking-tight group-hover:text-red-500 transition-colors">Arsenal</h2>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="w-full bg-(--bg-panel) border border-(--border-subtle) rounded-2xl p-2 mb-8 flex overflow-x-auto no-scrollbar shadow-sm sticky top-24 z-40">
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
              className="max-w-4xl mx-auto flex flex-col gap-6 w-full"
            >
              <div className="relative ml-4 md:ml-8 flex flex-col gap-8">
                {/* Vertical Timeline Line */}
                <div className="absolute top-0 bottom-0 left-5.25 w-0.5 bg-(--border-subtle)"></div>

                {[
                  { time: "82'", event: "Substitution (Arsenal)", type: "neutral", desc: "Saka out, Trossard in." },
                  { time: "71'", event: "Goal! (Man City)", type: "positive", desc: "De Bruyne scores a screamer from outside the box." },
                  { time: "55'", event: "Yellow Card (Man City)", type: "warning", desc: "Rodri booked for a late challenge." },
                  { time: "43'", event: "Goal! (Arsenal)", type: "negative", desc: "Odegaard equalizes right before half time." },
                  { time: "12'", event: "Goal! (Man City)", type: "positive", desc: "Haaland taps it in from a cross by Grealish." },
                ].map((log, idx) => (
                  <div key={idx} className="relative flex gap-8 group">
                    <div className="shrink-0 mt-1.5 z-10">
                      <div className={`w-11 h-11 rounded-full border-[3px] border-(--bg-primary) shadow-sm flex items-center justify-center text-white ${
                        log.type === 'positive' ? 'bg-blue-500' : 
                        log.type === 'negative' ? 'bg-red-500' : 
                        log.type === 'warning' ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`}>
                         {log.type === 'positive' || log.type === 'negative' ? '⚽' : log.type === 'warning' ? '🟨' : '🔄'}
                      </div>
                    </div>
                    
                    <div className="grow bg-(--bg-panel) border border-(--border-subtle) rounded-2xl p-6 shadow-sm hover:border-(--color-brand) transition-colors">
                      <div className="flex items-center gap-4 mb-2">
                        <span className={`font-display font-black text-2xl ${
                          log.type === 'positive' ? 'text-blue-500' : 
                          log.type === 'negative' ? 'text-red-500' : 
                          log.type === 'warning' ? 'text-yellow-500' :
                          'text-gray-500'
                        }`}>
                          {log.time}
                        </span>
                        <h4 className="font-display font-bold text-(--text-main) text-xl tracking-wide">{log.event}</h4>
                      </div>
                      <p className="text-(--text-muted) font-medium text-sm">{log.desc}</p>
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
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full"
            >
              {/* Team A Squad */}
              <MagicCard className="flex flex-col gap-6 p-8" gradientColor="rgba(16, 185, 129, 0.15)">
                <div className="flex items-center justify-between border-b border-(--border-subtle) pb-4">
                  <h3 className="text-2xl font-display font-black text-(--text-main) uppercase tracking-tight">Man City Squad</h3>
                  <span className="text-xs font-bold text-(--text-muted) bg-(--bg-secondary) px-3 py-1 rounded-md uppercase tracking-widest">4-3-3</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(num => {
                    const playerObj = { id: `city_${num}`, name: `City Player ${num}`, team: 'Man City', num };
                    const checked = isSelected(playerObj.id);
                    const disabled = !checked && isFull;
                    return (
                      <div 
                        key={num} 
                        onClick={() => !disabled && togglePlayer(playerObj)}
                        className={`flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer group ${checked ? 'bg-(--color-brand)/10 border-(--color-brand)' : disabled ? 'opacity-50 cursor-not-allowed bg-(--bg-secondary) border-transparent' : 'bg-(--bg-secondary) border-transparent hover:border-(--color-brand)'}`}
                      >
                        <div className="flex items-center gap-4">
                          <button disabled={disabled} className="text-(--text-muted) group-hover:text-(--color-brand) transition-colors">
                            {checked ? <CheckSquare size={20} className="text-(--color-brand)" /> : <Square size={20} />}
                          </button>
                          <div className={`w-10 h-10 rounded-full shadow-sm flex items-center justify-center font-display font-black transition-colors ${checked ? 'bg-(--color-brand) text-white' : 'bg-(--bg-panel) text-(--color-brand) group-hover:bg-(--color-brand) group-hover:text-white'}`}>
                            {num}
                          </div>
                          <span className={`font-bold tracking-wide ${checked ? 'text-(--color-brand)' : 'text-(--text-main)'}`}>{playerObj.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Starting</span>
                      </div>
                    );
                  })}
                </div>
              </MagicCard>

              {/* Team B Squad */}
              <MagicCard className="flex flex-col gap-6 p-8" gradientColor="rgba(239, 68, 68, 0.15)">
                <div className="flex items-center justify-between border-b border-(--border-subtle) pb-4">
                  <h3 className="text-2xl font-display font-black text-(--text-main) uppercase tracking-tight">Arsenal Squad</h3>
                  <span className="text-xs font-bold text-(--text-muted) bg-(--bg-secondary) px-3 py-1 rounded-md uppercase tracking-widest">4-2-3-1</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(num => {
                    const playerObj = { id: `ars_${num}`, name: `Arsenal Player ${num}`, team: 'Arsenal', num };
                    const checked = isSelected(playerObj.id);
                    const disabled = !checked && isFull;
                    return (
                      <div 
                        key={num} 
                        onClick={() => !disabled && togglePlayer(playerObj)}
                        className={`flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer group ${checked ? 'bg-red-500/10 border-red-500' : disabled ? 'opacity-50 cursor-not-allowed bg-(--bg-secondary) border-transparent' : 'bg-(--bg-secondary) border-transparent hover:border-red-500'}`}
                      >
                        <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Starting</span>
                        <div className="flex items-center gap-4">
                          <span className={`font-bold tracking-wide ${checked ? 'text-red-500' : 'text-(--text-main)'}`}>{playerObj.name}</span>
                          <div className={`w-10 h-10 rounded-full shadow-sm flex items-center justify-center font-display font-black transition-colors ${checked ? 'bg-red-500 text-white' : 'bg-(--bg-panel) text-red-500 group-hover:bg-red-500 group-hover:text-white'}`}>
                            {num}
                          </div>
                          <button disabled={disabled} className="text-(--text-muted) group-hover:text-red-500 transition-colors">
                            {checked ? <CheckSquare size={20} className="text-red-500" /> : <Square size={20} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </MagicCard>

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
              <div className="bg-(--bg-panel) border border-(--border-subtle) rounded-3xl p-8 md:p-12 shadow-sm">
                <div className="flex justify-between items-center mb-12">
                  <h3 className="text-2xl font-display font-black text-blue-500 uppercase tracking-tight">Man City</h3>
                  <Activity size={32} className="text-(--text-muted)" />
                  <h3 className="text-2xl font-display font-black text-red-500 uppercase tracking-tight">Arsenal</h3>
                </div>
                
                <div className="flex flex-col gap-8">
                  {stats.map((stat, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                        <span className="text-(--text-main)">{stat.home}</span>
                        <span className="text-(--text-muted)">{stat.label}</span>
                        <span className="text-(--text-main)">{stat.away}</span>
                      </div>
                      <div className="w-full bg-(--bg-secondary) rounded-full h-3 flex overflow-hidden shadow-inner border border-(--border-subtle)">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${stat.homePct}%` }} 
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="bg-blue-500 h-full rounded-r-sm" 
                        />
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${stat.awayPct}%` }} 
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="bg-red-500 h-full rounded-l-sm" 
                        />
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
                  <div className="col-span-full py-20 flex flex-col items-center justify-center bg-(--bg-panel) rounded-3xl border border-(--border-subtle) border-dashed">
                    <User size={48} className="text-(--text-muted) mb-4" />
                    <h4 className="text-xl font-bold text-(--text-main)">No Players Selected</h4>
                    <p className="text-(--text-muted) mt-2 mb-6 text-center max-w-md">Go to the Lineups tab and check the boxes next to the players you want to compare.</p>
                    <button 
                      onClick={() => setActiveTab('LINEUPS & SQUADS')}
                      className="px-8 py-3 bg-(--color-brand) text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-opacity-90 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                      Select Players
                    </button>
                  </div>
                ) : (
                  selectedPlayers.map((player) => (
                    <div key={player.id} className="bg-(--bg-panel) border border-(--border-subtle) rounded-3xl p-8 shadow-sm flex flex-col items-center min-h-75 relative overflow-hidden group">
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => removePlayer(player.id)} className="text-(--text-muted) hover:text-red-500">
                           <Clock size={20} /> {/* Assuming Clock is a placeholder for a remove/X icon since X is not imported, let's just use CSS for a clear button or leave it */}
                           {/* Wait, I didn't import X. Let's just use text */}
                           <span className="text-xs uppercase font-bold text-red-500">Remove</span>
                        </button>
                      </div>
                      <div className="w-24 h-24 bg-(--bg-secondary) rounded-full mb-6 flex items-center justify-center text-(--text-main) shadow-inner border border-(--border-subtle) font-display font-black text-3xl">
                        {player.num}
                      </div>
                      <h4 className="font-bold text-xl text-(--text-main) text-center mb-1">{player.name}</h4>
                      <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${player.team === 'Man City' ? 'bg-(--color-brand)/20 text-(--color-brand)' : 'bg-red-500/20 text-red-500'}`}>
                        {player.team}
                      </span>
                      
                      <div className="mt-8 w-full flex flex-col gap-3">
                         {/* Mock stats for visual feedback */}
                         <div className="flex justify-between text-xs font-bold uppercase"><span className="text-(--text-muted)">OVR</span><span className="text-(--text-main)">85</span></div>
                         <div className="w-full bg-(--bg-secondary) h-2 rounded-full overflow-hidden"><div className="bg-(--color-brand) h-full w-[85%]"></div></div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-(--bg-panel) border border-(--border-subtle) rounded-3xl p-10 flex flex-col items-center justify-center shadow-sm mt-4">
                <BarChart3 size={48} className="text-(--border-subtle) mb-4" />
                <span className="text-(--color-brand) font-bold uppercase tracking-widest text-sm mb-2">Comparison Matrix</span>
                <p className="text-(--text-muted) font-medium text-center max-w-lg">Select players above to view detailed metric comparisons including Pace, Shooting, Passing, Dribbling, and Defending.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </motion.div>
  );
}
