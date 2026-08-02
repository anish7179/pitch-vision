import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Players() {
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
  const players = [
    { id: 1100, name: 'Erling Haaland', role: 'Forward', team: 'Manchester City' },
    { id: 284, name: 'Jude Bellingham', role: 'Midfielder', team: 'Real Madrid' },
    { id: 278, name: 'Kylian Mbappé', role: 'Forward', team: 'Real Madrid' },
    { id: 644, name: 'Vinícius Júnior', role: 'Forward', team: 'Real Madrid' },
    { id: 627, name: 'Kevin De Bruyne', role: 'Midfielder', team: 'Manchester City' },
    { id: 625, name: 'Rodri', role: 'Midfielder', team: 'Manchester City' },
    { id: 1462, name: 'Bukayo Saka', role: 'Forward', team: 'Arsenal' },
    { id: 184, name: 'Harry Kane', role: 'Forward', team: 'Bayern Munich' },
  ];

  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants}
      className="w-full flex flex-col p-4 md:p-8 transition-colors duration-300 font-sans"
    >
      <div className="w-full flex flex-col gap-8 mt-10">
        
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm transition-colors duration-300">
          <div>
            <h1 className="text-5xl font-display font-bold text-gray-900 dark:text-white uppercase tracking-tighter shadow-sm mb-2">Players</h1>
            <p className="text-gray-500 dark:text-zinc-400 font-medium">Scout the world's best talent</p>
          </div>
        </motion.div>
          
        <motion.div variants={itemVariants} className="relative w-full">
          <input 
            type="text" 
            placeholder="Search players..." 
            className="w-full max-w-lg bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-xl px-5 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 mb-6 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 pl-10 font-sans transition-all"
          />
          <span className="absolute left-4 top-3 text-gray-400 dark:text-zinc-500">🔍</span>
        </motion.div>
        
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
          {players.map(player => (
            <motion.div key={player.id} variants={itemVariants}>
              <Link to={`/player/${player.id}`} className="block bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center text-center hover:border-green-500 hover:-translate-y-2 hover:shadow-lg transition-all cursor-pointer group">
                <div className="w-24 h-24 rounded-full mb-4 bg-gray-100 dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 object-cover overflow-hidden group-hover:scale-105 transition-transform flex justify-center items-center">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt={player.name} className="w-full h-full bg-transparent" />
                </div>
                <div className="text-center">
                  <h3 className="font-display font-semibold text-gray-900 dark:text-white text-xl leading-tight group-hover:text-green-500 transition-colors">{player.name}</h3>
                  <div className="flex flex-col items-center justify-center gap-1 mt-3">
                    <span className="text-xs font-bold bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-3 py-1 rounded-sm uppercase tracking-widest">{player.role}</span>
                    <span className="text-gray-500 dark:text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">{player.team}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
