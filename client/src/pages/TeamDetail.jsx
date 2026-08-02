import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { useTeamData } from '../hooks/useTeamData';

export default function TeamDetail() {
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
  const [activeTab, setActiveTab] = useState('SQUAD');
  const [following, setFollowing] = useState(false);
  
  const { data, loading, error, isQuotaExhausted, season, changeSeason } = useTeamData(id);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center font-display uppercase tracking-widest text-green-500 font-bold">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        Loading Team Profile...
      </div>
    );
  }

  if (isQuotaExhausted) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center font-display font-bold text-center px-4">
        <AlertTriangle size={64} className="text-orange-500 mb-6" />
        <h2 className="text-3xl text-gray-900 dark:text-white uppercase tracking-tight mb-2">Quota Exceeded</h2>
        <p className="text-gray-500 max-w-md">The daily API request limit has been reached. Historical data requires a fresh fetch. Please try again tomorrow.</p>
      </div>
    );
  }

  if (error || !data?.team) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center font-display font-bold text-red-500 uppercase tracking-widest text-center px-4">
        {error || 'Team not found'}
      </div>
    );
  }

  const { team, squad } = data;
  
  // Group squad by position
  const squadByPos = squad.reduce((acc, player) => {
    const pos = player.position || 'Unknown';
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(player);
    return acc;
  }, {});

  const positionOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'];

  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants}
      className="w-full flex flex-col p-6 md:p-12 lg:p-16 transition-colors duration-300 font-sans mt-8"
    >
      
      {/* Hero Banner with dynamic team color */}
      <motion.div variants={itemVariants} className="w-full relative overflow-hidden flex flex-col lg:flex-row items-center justify-between px-10 py-12 lg:py-16 rounded-xl mb-2 transition-colors duration-300" style={{ background: `linear-gradient(135deg, #16a34a 0%, #0a0a0a 100%)` }}>
        
        {/* Left Info */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 z-10 text-center lg:text-left">
          <img src={team?.logo || `https://api.dicebear.com/7.x/shapes/svg?seed=${team?.name}`} alt="Club Logo" className="w-32 h-32 lg:w-40 lg:h-40 bg-white/90 rounded-full p-3 shadow-lg border-2 border-white/20" />
          <div className="flex flex-col text-white mt-2 justify-center">
            <h1 className="text-5xl lg:text-6xl font-display font-black tracking-tight uppercase mb-2 shadow-sm">{team?.name}</h1>
            <p className="text-white/70 font-bold tracking-widest uppercase text-sm mb-6">{team?.country}</p>
            
            <div className="flex items-center justify-center lg:justify-start">
              <button 
                onClick={() => setFollowing(!following)}
                className={`px-8 py-2.5 text-sm font-display font-bold transition-all rounded-md flex items-center gap-2 shadow-md ${
                  following 
                    ? 'bg-white text-gray-900 hover:bg-gray-100' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                <span className="text-lg leading-none">{following ? '✓' : '+'}</span>
                <span>{following ? 'Following' : 'Follow'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
          <div className="w-[150%] h-full bg-black/20 transform rotate-12 translate-x-1/3 border-l border-white/5"></div>
        </div>
      </motion.div>

      {/* Season Selector */}
      <motion.div variants={itemVariants} className="w-full flex justify-end mb-6 z-50">
        <div className="relative group">
          <select 
            value={season}
            onChange={(e) => changeSeason(e.target.value)}
            className="appearance-none bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white font-display font-bold uppercase tracking-widest px-6 py-3 pr-12 rounded-xl focus:outline-none focus:border-green-500 cursor-pointer shadow-sm hover:border-green-500 transition-colors"
          >
            {[2024, 2023, 2022, 2021, 2020].map(y => (
              <option key={y} value={y}>{y}/{y-1999}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-green-500 transition-colors">
            <ChevronDown size={20} />
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="w-full border-b border-gray-200 dark:border-zinc-800 px-4 overflow-x-auto no-scrollbar bg-white dark:bg-[#0a0a0a] shadow-sm sticky top-20 z-40 transition-colors duration-300">
        <div className="flex gap-10">
          {['SQUAD', 'NEXT MATCHES', 'RESULTS', 'STATISTICS', 'TRANSFERS'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-5 text-sm font-display font-bold uppercase tracking-widest transition-colors relative whitespace-nowrap ${
                activeTab === tab 
                  ? 'text-green-500' 
                  : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-500"></div>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content Area */}
      <motion.div variants={itemVariants} className="w-full py-12 flex flex-col gap-12 transition-colors duration-300">
        <AnimatePresence mode="wait">
          {activeTab === 'SQUAD' && (
            <motion.div 
              key="squad"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-12 items-start"
            >
              <div className="grow flex flex-col gap-12 w-full">
                {positionOrder.map(pos => {
                  const players = squadByPos[pos] || [];
                  if (players.length === 0) return null;
                  
                  return (
                    <div key={pos} className="flex flex-col gap-6">
                      <h3 className="text-2xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight border-b-2 border-gray-200 dark:border-zinc-800 pb-2">{pos}s</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {players.map(player => (
                          <Link to={`/player/${player.id}`} key={player.id}>
                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col relative overflow-hidden group cursor-pointer hover:shadow-lg hover:border-green-500 transition-all h-full">
                              <div className="flex justify-between items-start z-10">
                                <div className="flex flex-col">
                                  <span className="text-xl font-display font-black text-gray-900 dark:text-white uppercase leading-none group-hover:text-green-500 transition-colors line-clamp-1" title={player.name}>{player.name}</span>
                                  <div className="flex items-center gap-2 mt-2">
                                    <img src={team?.logo} alt="team" className="w-5 h-5 rounded bg-white p-0.5 object-contain" />
                                    <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 truncate">{team?.name}</span>
                                  </div>
                                </div>
                                
                                <div className="w-12 h-12 flex flex-col items-center justify-center bg-green-50 dark:bg-green-900/20 border border-green-500/30 rounded-sm p-1 shadow-sm group-hover:bg-green-500 transition-colors shrink-0">
                                  <span className="text-xl font-display font-black text-green-600 dark:text-green-400 group-hover:text-white leading-none transition-colors">{player.number || '-'}</span>
                                  <span className="text-[9px] font-bold text-green-600/70 dark:text-green-400/70 group-hover:text-white/70 uppercase transition-colors">Num</span>
                                </div>
                              </div>

                              <div className="flex items-end justify-between mt-6 z-10">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Age: {player.age || 'N/A'}</span>
                                </div>
                                <img src={player.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt={player.name} className="w-20 h-20 bg-gray-100 dark:bg-black rounded-full border-2 border-gray-200 dark:border-zinc-700 shadow-sm group-hover:border-green-500 transition-colors object-cover" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab !== 'SQUAD' && (
            <motion.div 
              key="other"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-20 text-gray-400 dark:text-zinc-500 font-display font-bold text-xl uppercase tracking-widest bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl"
            >
              {activeTab} content loading...
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
