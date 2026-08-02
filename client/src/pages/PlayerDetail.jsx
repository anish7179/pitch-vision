import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import PlayerHeatmap from '../components/PlayerHeatmap';
import CareerStats from '../components/CareerStats';

export default function PlayerDetail() {
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
  const [following, setFollowing] = useState(false);
  const [heatmapMatchId, setHeatmapMatchId] = useState("3869685"); // Default: World Cup Final
  const [activeTab, setActiveTab] = useState('heatmap'); // 'heatmap', 'xgmap', 'passnetwork', 'career'

  // Phase 7: Dynamic Dataset Navigation State
  const [competitions, setCompetitions] = useState([]);
  const [selectedCompId, setSelectedCompId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [matches, setMatches] = useState([]);

  // Fetch Competitions on Mount
  useEffect(() => {
    fetch('http://localhost:5000/api/football/competitions')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCompetitions(data.data);
        }
      })
      .catch(err => console.error("Error fetching competitions:", err));
  }, []);

  // Fetch Matches when Season selected
  useEffect(() => {
    if (selectedCompId && selectedSeasonId) {
      fetch(`http://localhost:5000/api/football/matches/${selectedCompId}/${selectedSeasonId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMatches(data.data);
            if (data.data.length > 0) {
              setHeatmapMatchId(data.data[0].match_id.toString());
            }
          }
        })
        .catch(err => console.error("Error fetching matches:", err));
    } else {
      setMatches([]);
    }
  }, [selectedCompId, selectedSeasonId]);

  // Derived state for dropdowns
  const uniqueLeagues = Array.from(new Set(competitions.map(c => c.competition_id)))
    .map(id => competitions.find(c => c.competition_id === id));
  const availableSeasons = competitions.filter(c => c.competition_id.toString() === selectedCompId);

  const handleCompChange = (e) => {
    setSelectedCompId(e.target.value);
    setSelectedSeasonId('');
    setMatches([]);
  };

  const handleSeasonChange = (e) => {
    setSelectedSeasonId(e.target.value);
  };

  const { data, loading, error, isQuotaExhausted, season, changeSeason } = usePlayerProfile(id);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center font-display uppercase tracking-widest text-green-500 font-bold">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        Loading Player Profile...
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

  if (error || !data?.player) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center font-display font-bold text-red-500 uppercase tracking-widest text-center px-4">
        {error || 'Player not found'}
      </div>
    );
  }

  const { player, statistics, transfers } = data;
  
  // Find the primary statistics object (usually the first one, representing the main league)
  const primaryStats = statistics && statistics.length > 0 ? statistics[0] : null;
  const team = primaryStats?.team;
  const league = primaryStats?.league;
  const games = primaryStats?.games;
  const goals = primaryStats?.goals;

  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants}
      className="w-full flex flex-col p-6 md:p-12 lg:p-16 transition-colors duration-300 font-sans mt-8"
    >
      <div className="w-full flex flex-col gap-16 mt-10">
        
        {/* Hero Banner */}
        <motion.div variants={itemVariants} className="w-full bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden transition-colors duration-300">
          <div className="h-56 bg-linear-to-r from-green-900 to-gray-900 text-white flex items-center justify-between px-10 relative overflow-hidden border-b border-green-500/20">
            <div className="absolute -right-10 -top-20 opacity-10">
              <span className="text-[20rem] font-display font-black leading-none text-green-400">9</span>
            </div>
            
            <div className="flex items-center gap-8 z-10">
              <div className="w-36 h-36 bg-white rounded-full border-4 border-white/20 overflow-hidden shadow-lg hover:border-green-400 transition-colors">
                <img src={player.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt={player.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-5xl md:text-6xl font-display font-black tracking-tight uppercase shadow-sm">
                  {player.firstname} <span className="text-green-400">{player.lastname}</span>
                </h1>
                <div className="flex flex-wrap gap-4 mt-4">
                  <span className="bg-white/10 text-white font-display font-bold px-4 py-1.5 rounded-sm text-sm tracking-widest shadow-sm uppercase">{games?.position || 'Unknown'}</span>
                  {team && (
                    <span className="bg-white/10 text-white font-display font-bold px-4 py-1.5 rounded-sm text-sm tracking-widest shadow-sm uppercase flex items-center gap-2">
                      {team.logo && <img src={team.logo} alt="team" className="w-4 h-4 rounded-full" />}
                      {team.name}
                    </span>
                  )}
                  <span className="bg-white/10 text-white font-display font-bold px-4 py-1.5 rounded-sm text-sm tracking-widest shadow-sm uppercase">{player.nationality || 'Unknown'}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setFollowing(!following)}
              className={`z-10 px-8 py-2.5 text-sm font-display font-bold transition-all rounded-md flex items-center gap-2 shadow-md ${
                following 
                  ? 'bg-white text-gray-900 hover:bg-gray-100' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              <span className="text-lg leading-none">{following ? '✓' : '+'}</span>
              <span>{following ? 'Following' : 'Follow'}</span>
            </button>
          </div>
        </motion.div>

        {/* Season Selector */}
        <motion.div variants={itemVariants} className="w-full flex justify-end -mt-8 mb-2 z-50">
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

        {/* Profile Stats Cards */}
        <motion.div variants={itemVariants} className="flex flex-col gap-6">
          <h3 className="text-2xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight border-b-2 border-gray-200 dark:border-zinc-800 pb-2">Profile</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Age', value: player.age || 'N/A' },
              { label: 'Height', value: player.height || 'N/A' },
              { label: 'Weight', value: player.weight || 'N/A' },
              { label: 'Number', value: games?.number || '-', highlight: true },
            ].map(stat => (
              <div key={stat.label} className={`rounded-xl p-8 text-center border shadow-sm transition-colors duration-300 hover:border-green-500 ${stat.highlight ? 'bg-green-50 dark:bg-green-900/20 border-green-500/30' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800'}`}>
                <p className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                <p className={`text-4xl font-display font-black mt-2 ${stat.highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Current Season Stats */}
        <motion.div variants={itemVariants} className="flex flex-col gap-6">
          <h3 className="text-2xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight border-b-2 border-gray-200 dark:border-zinc-800 pb-2">Season Stats ({season})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-10 text-center shadow-sm transition-colors duration-300 hover:border-green-500">
              <p className="text-sm font-bold text-gray-500 dark:text-zinc-500 uppercase mb-3 tracking-widest">Matches Played</p>
              <p className="text-6xl font-display font-black text-gray-900 dark:text-white">{games?.appearences || 0}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-500 rounded-xl p-10 text-center shadow-md transition-colors duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-500 rounded-bl-full opacity-20 pointer-events-none"></div>
              <p className="text-sm font-bold text-green-600 dark:text-green-400 uppercase mb-3 tracking-widest">Goals</p>
              <p className="text-7xl font-display font-black text-green-600 dark:text-green-400">{goals?.total || 0}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-10 text-center shadow-sm transition-colors duration-300 hover:border-green-500">
              <p className="text-sm font-bold text-gray-500 dark:text-zinc-500 uppercase mb-3 tracking-widest">Assists</p>
              <p className="text-6xl font-display font-black text-gray-900 dark:text-white">{goals?.assists || 0}</p>
            </div>
          </div>
        </motion.div>

        {/* Module Tabs */}
        <motion.div variants={itemVariants} className="w-full flex justify-center mt-4 mb-2 z-40">
          <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg w-full max-w-2xl">
            {[
              { id: 'heatmap', label: 'Heatmap' },
              { id: 'xgmap', label: 'xG Map' },
              { id: 'passnetwork', label: 'Pass Network' },
              { id: 'career', label: 'Career History' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {activeTab === 'career' ? (
          <motion.div variants={itemVariants} className="flex flex-col gap-6">
            <h3 className="text-2xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight border-b-2 border-gray-200 dark:border-zinc-800 pb-2">Career History</h3>
            <CareerStats playerId={id} />
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b-2 border-gray-200 dark:border-zinc-800 pb-4 gap-4">
              <h3 className="text-2xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight whitespace-nowrap">
                {activeTab === 'heatmap' ? 'Heatmap' : activeTab === 'xgmap' ? 'xG Map' : 'Pass Network'}
              </h3>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* League Selector */}
              <div className="relative group flex-1 md:flex-none">
                <select 
                  value={selectedCompId}
                  onChange={handleCompChange}
                  className="w-full appearance-none bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-display font-bold uppercase tracking-widest px-4 py-2 pr-8 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer text-xs transition-colors truncate"
                >
                  <option value="">Select League</option>
                  {uniqueLeagues.map(l => (
                    <option key={l.competition_id} value={l.competition_id}>{l.competition_name}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <ChevronDown size={14} />
                </div>
              </div>

              {/* Season Selector */}
              <div className="relative group flex-1 md:flex-none">
                <select 
                  value={selectedSeasonId}
                  onChange={handleSeasonChange}
                  disabled={!selectedCompId}
                  className="w-full appearance-none bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-display font-bold uppercase tracking-widest px-4 py-2 pr-8 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer text-xs transition-colors disabled:opacity-50 truncate"
                >
                  <option value="">Select Season</option>
                  {availableSeasons.map(s => (
                    <option key={s.season_id} value={s.season_id}>{s.season_name}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <ChevronDown size={14} />
                </div>
              </div>

              {/* Match Selector */}
              <div className="relative group flex-2 md:flex-none min-w-50">
                <select 
                  value={heatmapMatchId}
                  onChange={(e) => setHeatmapMatchId(e.target.value)}
                  disabled={matches.length === 0}
                  className="w-full appearance-none bg-green-50 dark:bg-green-900/20 border border-green-500/30 text-green-700 dark:text-green-400 font-display font-bold uppercase tracking-widest px-4 py-2 pr-8 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer text-xs transition-colors disabled:opacity-50 truncate"
                >
                  {matches.length === 0 ? (
                    <option value="">{selectedSeasonId ? 'Loading...' : 'Select Match'}</option>
                  ) : (
                    matches.map(m => (
                      <option key={m.match_id} value={m.match_id}>
                        {m.home_team.home_team_name} vs {m.away_team.away_team_name}
                      </option>
                    ))
                  )}
                  {/* Always keep a fallback option for the default match if it's not in the list yet */}
                  {!matches.find(m => m.match_id.toString() === "3869685") && (
                    <option value="3869685">2022 World Cup Final (Fallback)</option>
                  )}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-green-600 dark:text-green-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          </div>
          <div className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm transition-colors duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 flex flex-col justify-center gap-4">
                <h4 className="text-xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight">Action Areas</h4>
                <p className="text-gray-500 dark:text-zinc-400 text-sm leading-relaxed">
                  This heatmap displays {player.lastname}'s most frequent touches and actions on the pitch. The glowing density contours indicate high-activity zones where the player was most influential in building up play or attacking.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-bold uppercase tracking-wider">Passes</span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-bold uppercase tracking-wider">Carries</span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-bold uppercase tracking-wider">Shots</span>
                </div>
              </div>
              <div className="lg:col-span-2">
                <PlayerHeatmap matchId={heatmapMatchId} playerId={id} viewState={activeTab} />
              </div>
            </div>
          </div>
        </motion.div>
        )}

        {/* Transfer History Table */}
        <motion.div variants={itemVariants} className="flex flex-col gap-6">
          <h3 className="text-2xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight border-b-2 border-gray-200 dark:border-zinc-800 pb-2">Transfer History</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
            <table className="w-full text-left border-collapse bg-white dark:bg-zinc-900 transition-colors duration-300">
              <thead className="bg-gray-50 dark:bg-black">
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-500 font-display uppercase tracking-widest text-xs">
                  <th className="py-5 px-6 font-bold">Date</th>
                  <th className="py-5 px-6 font-bold">Type</th>
                  <th className="py-5 px-6 font-bold">From</th>
                  <th className="py-5 px-6 font-bold">To</th>
                </tr>
              </thead>
              <tbody className="text-gray-900 dark:text-white font-medium">
                {transfers && transfers.length > 0 ? (
                  transfers.map((transfer, idx) => (
                    <tr key={idx} className="border-b border-gray-200 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group">
                      <td className="py-5 px-6 font-display font-bold text-gray-500 dark:text-zinc-300">{transfer.date}</td>
                      <td className="py-5 px-6 font-display font-bold text-(--color-brand)">{transfer.type}</td>
                      <td className="py-5 px-6 flex items-center gap-4">
                        <img src={transfer.teams?.out?.logo} alt="logo" className="w-8 h-8 rounded bg-white border border-gray-300 object-contain p-1" />
                        <span className="font-display font-bold tracking-wide">{transfer.teams?.out?.name}</span>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-4">
                          <img src={transfer.teams?.in?.logo} alt="logo" className="w-8 h-8 rounded bg-white border border-gray-300 object-contain p-1" />
                          <span className="font-display font-bold tracking-wide">{transfer.teams?.in?.name}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-500 uppercase tracking-widest text-sm font-bold">No transfer history found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
