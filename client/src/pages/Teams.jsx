import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Teams() {
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
  const teams = [
    { id: 50, name: 'Manchester City', country: 'England' },
    { id: 42, name: 'Arsenal', country: 'England' },
    { id: 40, name: 'Liverpool', country: 'England' },
    { id: 541, name: 'Real Madrid', country: 'Spain' },
    { id: 529, name: 'Barcelona', country: 'Spain' },
    { id: 157, name: 'Bayern Munich', country: 'Germany' },
    { id: 505, name: 'Inter Milan', country: 'Italy' },
    { id: 85, name: 'PSG', country: 'France' },
  ];

  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants}
      className="w-full flex flex-col p-4 md:p-8 transition-colors duration-300 font-sans"
    >
      <div className="w-full flex flex-col gap-6 mt-10">
        
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-4">
            <span className="text-5xl shadow-sm rounded-full">🛡️</span>
            <div>
              <h1 className="text-4xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tighter">Teams</h1>
              <p className="text-gray-500 dark:text-zinc-400 font-medium tracking-widest uppercase text-xs mt-1">Browse and follow your favorite clubs</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="relative w-full md:w-96 mb-4">
          <input 
            type="text" 
            placeholder="Search teams..." 
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-black text-gray-900 dark:text-white font-display focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-colors duration-300 placeholder-gray-400 dark:placeholder-zinc-500"
          />
          <span className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-500">🔍</span>
        </motion.div>
        
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {teams.map((team) => (
            <Link key={team.id} to={`/team/${team.id}`} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center gap-4 hover:shadow-lg hover:border-green-500 transition-all cursor-pointer group">
              <div className="w-24 h-24 bg-gray-100 dark:bg-black rounded-full flex items-center justify-center border-2 border-gray-200 dark:border-zinc-800 group-hover:border-green-500 group-hover:scale-105 transition-transform shadow-sm">
                <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${team.name}`} alt={team.name} className="w-12 h-12" />
              </div>
              <div className="text-center">
                <h3 className="font-display font-black text-gray-900 dark:text-white text-xl leading-tight group-hover:text-green-500 tracking-wide transition-colors">{team.name}</h3>
                <p className="text-gray-500 dark:text-zinc-500 text-sm font-bold uppercase tracking-widest mt-1">{team.country}</p>
              </div>
            </Link>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
