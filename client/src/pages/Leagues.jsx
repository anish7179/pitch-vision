import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Leagues() {
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
  const [activeTab, setActiveTab] = useState('Table');

  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants}
      className="w-full flex flex-col p-4 md:p-8 transition-colors duration-300 font-sans"
    >
      <div className="w-full flex flex-col gap-6 mt-10">
        
        {/* Header & Selector */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-4">
            <span className="text-5xl shadow-sm rounded-full">🏆</span>
            <div>
              <h2 className="text-4xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tighter">Competitions</h2>
              <p className="text-gray-500 dark:text-zinc-400 font-medium tracking-widest uppercase text-xs mt-1">Global league standings and analytics</p>
            </div>
          </div>
          <select className="bg-gray-50 dark:bg-black border border-gray-300 dark:border-zinc-800 text-gray-900 dark:text-white font-display font-bold rounded-sm px-6 py-3 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-lg cursor-pointer transition-colors hover:border-green-500">
            <option>Premier League</option>
            <option>La Liga</option>
            <option>Serie A</option>
            <option>Bundesliga</option>
            <option>Champions League</option>
          </select>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants} className="flex gap-2 bg-white dark:bg-zinc-900 p-1 border border-gray-200 dark:border-zinc-800 transition-colors duration-300 rounded-lg">
          {['Table', 'Fixtures', 'Stats', 'Teams'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 text-sm font-display font-bold transition-colors uppercase tracking-widest rounded-md ${
                activeTab === tab 
                  ? 'bg-green-500 text-white shadow-sm' 
                  : 'text-gray-500 dark:text-zinc-500 hover:text-green-500 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span>{tab}</span>
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Table Content */}
          {activeTab === 'Table' && (
            <motion.div 
              key="table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-colors duration-300"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 dark:bg-black transition-colors duration-300 border-b border-gray-200 dark:border-zinc-800">
                    <tr className="text-gray-500 dark:text-zinc-500 font-display uppercase tracking-widest text-xs">
                      <th className="py-5 px-6 font-bold w-12 text-center">#</th>
                      <th className="py-5 px-6 font-bold">Club</th>
                      <th className="py-5 px-6 font-bold text-center">MP</th>
                      <th className="py-5 px-6 font-bold text-center">W</th>
                      <th className="py-5 px-6 font-bold text-center">D</th>
                      <th className="py-5 px-6 font-bold text-center">L</th>
                      <th className="py-5 px-6 font-bold text-center">GD</th>
                      <th className="py-5 px-6 font-bold text-center text-green-500 text-sm">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900 dark:text-white font-medium">
                    {[
                      { pos: 1, team: 'Manchester City', p: 38, w: 28, d: 7, l: 3, gd: '+62', pts: 91 },
                      { pos: 2, team: 'Arsenal', p: 38, w: 28, d: 5, l: 5, gd: '+62', pts: 89 },
                      { pos: 3, team: 'Liverpool', p: 38, w: 24, d: 10, l: 4, gd: '+45', pts: 82 },
                      { pos: 4, team: 'Aston Villa', p: 38, w: 20, d: 8, l: 10, gd: '+15', pts: 68 },
                    ].map((row) => (
                      <tr key={row.pos} className="border-b border-gray-200 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group">
                        <td className="py-4 px-6 text-center font-display font-bold text-gray-500 dark:text-zinc-500">{row.pos}</td>
                        <td className="py-4 px-6 font-bold flex items-center gap-4">
                          <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${row.team}`} alt="logo" className="w-8 h-8 rounded bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700" />
                          <Link to="/team/1" className="font-display text-lg tracking-wide hover:text-green-500 transition-colors">{row.team}</Link>
                        </td>
                        <td className="py-4 px-6 text-center font-display">{row.p}</td>
                        <td className="py-4 px-6 text-center font-display">{row.w}</td>
                        <td className="py-4 px-6 text-center font-display">{row.d}</td>
                        <td className="py-4 px-6 text-center font-display">{row.l}</td>
                        <td className="py-4 px-6 text-center font-display">{row.gd}</td>
                        <td className="py-4 px-6 text-center font-display font-black text-green-500 text-xl bg-green-50 dark:bg-green-900/20 group-hover:bg-green-100 dark:group-hover:bg-green-900/40 transition-colors">{row.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'Fixtures' && (
            <motion.div 
              key="fixtures"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4 text-center py-20 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm"
            >
              <h3 className="text-3xl font-display font-bold text-gray-900 dark:text-white uppercase tracking-tighter">No fixtures scheduled</h3>
              <p className="text-gray-500 dark:text-zinc-500 font-medium">Check back later for upcoming matches in this competition.</p>
            </motion.div>
          )}

          {activeTab === 'Stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8 hover:border-green-500 transition-colors shadow-sm">
                <h3 className="font-bold text-green-500 mb-6 uppercase tracking-widest text-sm flex items-center gap-2"><span className="text-xl">⚽</span> Top Scorers</h3>
                <ul className="flex flex-col gap-4">
                  <li className="flex justify-between items-center text-gray-900 dark:text-white"><span className="flex items-center gap-4"><span className="text-gray-400 dark:text-zinc-600 font-display font-bold text-xl">1</span> <Link to="/player/1" className="hover:text-green-500 font-display font-bold text-lg tracking-wide transition-colors">Erling Haaland</Link></span> <span className="font-display font-black text-green-500 text-2xl">27</span></li>
                  <li className="flex justify-between items-center text-gray-900 dark:text-white"><span className="flex items-center gap-4"><span className="text-gray-400 dark:text-zinc-600 font-display font-bold text-xl">2</span> <Link to="/player/2" className="hover:text-green-500 font-display font-bold text-lg tracking-wide transition-colors">Cole Palmer</Link></span> <span className="font-display font-black text-green-500 text-2xl">22</span></li>
                  <li className="flex justify-between items-center text-gray-900 dark:text-white"><span className="flex items-center gap-4"><span className="text-gray-400 dark:text-zinc-600 font-display font-bold text-xl">3</span> <Link to="/player/3" className="hover:text-green-500 font-display font-bold text-lg tracking-wide transition-colors">Alexander Isak</Link></span> <span className="font-display font-black text-green-500 text-2xl">21</span></li>
                </ul>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8 hover:border-green-500 transition-colors shadow-sm">
                <h3 className="font-bold text-green-500 mb-6 uppercase tracking-widest text-sm flex items-center gap-2"><span className="text-xl">🎯</span> Top Assists</h3>
                <ul className="flex flex-col gap-4">
                  <li className="flex justify-between items-center text-gray-900 dark:text-white"><span className="flex items-center gap-4"><span className="text-gray-400 dark:text-zinc-600 font-display font-bold text-xl">1</span> <Link to="/player/4" className="hover:text-green-500 font-display font-bold text-lg tracking-wide transition-colors">Ollie Watkins</Link></span> <span className="font-display font-black text-green-500 text-2xl">13</span></li>
                  <li className="flex justify-between items-center text-gray-900 dark:text-white"><span className="flex items-center gap-4"><span className="text-gray-400 dark:text-zinc-600 font-display font-bold text-xl">2</span> <Link to="/player/5" className="hover:text-green-500 font-display font-bold text-lg tracking-wide transition-colors">Cole Palmer</Link></span> <span className="font-display font-black text-green-500 text-2xl">11</span></li>
                  <li className="flex justify-between items-center text-gray-900 dark:text-white"><span className="flex items-center gap-4"><span className="text-gray-400 dark:text-zinc-600 font-display font-bold text-xl">3</span> <Link to="/player/6" className="hover:text-green-500 font-display font-bold text-lg tracking-wide transition-colors">Kevin De Bruyne</Link></span> <span className="font-display font-black text-green-500 text-2xl">10</span></li>
                </ul>
              </div>
            </motion.div>
          )}

          {activeTab === 'Teams' && (
            <motion.div 
              key="teams"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6"
            >
              {[
                { id: 1, name: 'Manchester City' },
                { id: 2, name: 'Arsenal' },
                { id: 3, name: 'Liverpool' },
                { id: 4, name: 'Aston Villa' },
                { id: 5, name: 'Tottenham' },
                { id: 6, name: 'Chelsea' },
                { id: 7, name: 'Newcastle' },
                { id: 8, name: 'Manchester Utd' }
              ].map((team) => (
                <Link key={team.id} to={`/team/${team.id}`} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-green-500 hover:shadow-md transition-all group">
                  <div className="w-20 h-20 rounded bg-gray-100 dark:bg-black border border-gray-300 dark:border-zinc-700 flex items-center justify-center shadow-inner overflow-hidden group-hover:scale-105 transition-transform">
                    <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${team.name}`} className="w-full h-full opacity-90" />
                  </div>
                  <span className="font-display font-bold text-gray-900 dark:text-white text-center group-hover:text-green-500 transition-colors">
                    {team.name}
                  </span>
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
