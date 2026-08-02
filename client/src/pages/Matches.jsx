import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApi } from "../hooks/useApi";

export default function Matches() {
  const navigate = useNavigate();
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };
  
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const formattedDate = new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  
  const { data: matchesResponse, loading } = useApi('/spatial/matches');
  const allMatches = Array.isArray(matchesResponse) ? matchesResponse : [];
  const matches = allMatches.filter(m => m.date === selectedDate);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="w-full flex flex-col p-4 md:p-8 transition-colors duration-300 font-sans"
    >
      {/* Date Ribbon & Filters */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-gray-200 dark:border-zinc-800 pb-6 transition-colors duration-300 mt-10"
      >
        {/* Calendar Navigation */}
        <div className="flex flex-col gap-2 w-full xl:w-auto">
          <span className="text-gray-500 dark:text-zinc-500 text-xs font-bold uppercase tracking-widest">
            Calendar month: July
          </span>
          <div className="flex items-center justify-between w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 mb-8 overflow-x-auto no-scrollbar gap-2 shadow-sm">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-50 dark:bg-black border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 font-display font-bold outline-none focus:border-green-500 cursor-pointer text-sm"
            />
            <button className="text-gray-400 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white p-2 font-bold transition-colors">
              &lt;
            </button>
            <button className="text-gray-400 dark:text-zinc-400 font-semibold text-sm hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
              Yesterday
            </button>
            <button 
              onClick={() => setSelectedDate(today)}
              className="bg-green-500 text-white font-bold text-sm px-5 py-2 rounded-lg shadow-md whitespace-nowrap"
            >
              Today
            </button>
            <button className="text-gray-400 dark:text-zinc-400 font-semibold text-sm hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
              Tomorrow
            </button>
            <button className="text-gray-400 dark:text-zinc-400 font-semibold text-sm hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
              23 Thu
            </button>
            <button className="text-gray-400 dark:text-zinc-400 font-semibold text-sm hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
              24 Fri
            </button>
            <button className="text-gray-400 dark:text-zinc-400 font-semibold text-sm hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
              25 Sat
            </button>
            <button className="text-gray-400 dark:text-zinc-400 font-semibold text-sm hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
              26 Sun
            </button>
            <button className="text-gray-400 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white p-2 font-bold transition-colors">
              &gt;
            </button>
          </div>
        </div>

        {/* Match Type Filter */}
        <div className="flex flex-col gap-2">
          <span className="text-gray-500 dark:text-zinc-500 text-xs font-bold uppercase tracking-widest">
            Filter by match type
          </span>
          <div className="flex items-center gap-3">
            <button className="px-6 py-2.5 rounded-lg border-2 border-green-500 text-green-500 font-bold bg-green-50 dark:bg-green-900/20 shadow-sm transition-colors duration-300">
              ALL
            </button>
            <button className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-300 font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2">
              <span className="text-green-500 text-xs">▶</span> WATCH
            </button>
            <button className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-300 font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              LIVE NOW
            </button>
          </div>
        </div>
      </motion.div>

      {/* Matches Content */}
      <motion.div variants={containerVariants} className="flex flex-col gap-8">
        <motion.div variants={itemVariants}>
          <h2 className="text-4xl font-display font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            {selectedDate === today ? "Today's Matches" : "Matches"}
          </h2>
          <p className="text-gray-500 dark:text-zinc-400 font-medium mt-1">
            {formattedDate}
          </p>
        </motion.div>

        <div className="flex flex-col gap-6">
          {/* League Group */}
          <div className="flex flex-col gap-4">
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-4 mb-2"
            >
              <div className="w-10 h-10 rounded-sm bg-green-500 flex items-center justify-center text-white shadow-sm">
                <span className="font-display font-bold">UCL</span>
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-gray-900 dark:text-white leading-tight uppercase">
                  UEFA Champions League
                </h3>
                <p className="text-gray-500 dark:text-zinc-500 text-sm font-semibold uppercase tracking-widest">
                  Round 2 first leg
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {loading ? (
                <div className="col-span-full py-12 flex justify-center text-(--text-muted) font-bold tracking-widest uppercase">
                  Loading matches...
                </div>
              ) : matches.length === 0 ? (
                <div className="col-span-full py-12 flex justify-center text-(--text-muted) font-bold tracking-widest uppercase">
                  No matches found for this date
                </div>
              ) : (
                matches.map((match) => (
                  <motion.div
                    variants={itemVariants}
                    key={match.match_id}
                    onClick={() => navigate(`/match/${match.match_id}`)}
                    className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl flex overflow-hidden hover:shadow-lg hover:border-green-500 transition-all cursor-pointer group"
                  >
                    <div className="grow p-5 flex flex-col justify-center gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 rounded-full shadow-sm bg-(--color-brand)"></div>
                          <span className="font-bold text-gray-900 dark:text-white font-sans text-lg">
                            {match.home_team} vs {match.away_team}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <span>Spatial Events Available</span>
                      </div>
                    </div>

                    <div className="w-28 bg-gray-50 dark:bg-black border-l border-gray-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 p-3 group-hover:bg-green-50 dark:group-hover:bg-green-900/20 transition-colors relative overflow-hidden">
                      <button className="text-sm font-bold text-gray-500 dark:text-zinc-500 group-hover:text-green-500 flex items-center gap-1 transition-colors relative z-10 uppercase tracking-widest">
                        <span className="text-green-500 text-xs">▶</span> View
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
