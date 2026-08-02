import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

// Anish Dhananjay Pawar (23BCE11329)

export default function CareerStats({ playerId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:5000/api/football/player/${playerId}/history`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHistory(data.data);
        } else {
          setError(data.message || 'Failed to load historical data');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching player history:', err);
        setError('Error loading historical data');
        setLoading(false);
      });
  }, [playerId]);

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-75 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-display font-bold uppercase tracking-widest text-sm">Loading Career History...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-75 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8 text-center">
        <Activity className="text-red-500 mb-4" size={48} />
        <p className="text-red-500 font-display font-bold uppercase tracking-widest text-sm">{error}</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-75 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8 text-center">
        <Activity className="text-gray-400 dark:text-zinc-600 mb-4" size={48} />
        <p className="text-gray-500 dark:text-zinc-400 font-display font-bold uppercase tracking-widest text-sm">
          No historical data available for this player
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-black">
            <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-500 font-display uppercase tracking-widest text-xs">
              <th className="py-4 px-6 font-bold">Season</th>
              <th className="py-4 px-6 font-bold">Club</th>
              <th className="py-4 px-6 font-bold text-center">Appearances</th>
              <th className="py-4 px-6 font-bold text-center">Goals</th>
              <th className="py-4 px-6 font-bold text-center">Assists</th>
              <th className="py-4 px-6 font-bold text-center">Minutes</th>
            </tr>
          </thead>
          <tbody className="text-gray-900 dark:text-white font-medium">
            {history.map((stat, idx) => (
              <tr key={idx} className="border-b border-gray-200 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                <td className="py-4 px-6 font-display font-bold text-gray-500 dark:text-zinc-300">{stat.season}</td>
                <td className="py-4 px-6 font-display font-bold tracking-wide">{stat.club}</td>
                <td className="py-4 px-6 text-center text-lg">{stat.appearances}</td>
                <td className="py-4 px-6 text-center text-green-600 dark:text-green-400 text-lg font-bold">{stat.goals}</td>
                <td className="py-4 px-6 text-center text-lg">{stat.assists}</td>
                <td className="py-4 px-6 text-center text-gray-500 dark:text-zinc-400">{stat.minutes}'</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
