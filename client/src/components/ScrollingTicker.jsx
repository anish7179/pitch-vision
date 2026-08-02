import React from 'react';
import { motion } from 'framer-motion';

const MOCK_MATCHES = [
  { match: "MCI 2 - 1 ARS", time: "82'" },
  { match: "LIV 0 - 0 CHE", time: "HT" },
  { match: "MUN 1 - 3 TOT", time: "FT" },
  { match: "NEW 2 - 2 AVL", time: "64'" },
  { match: "BHA 1 - 0 WHU", time: "12'" },
  { match: "CRY 0 - 1 EVE", time: "FT" },
];

export default function ScrollingTicker() {
  return (
    <div className="w-full bg-[#022c22] border-y border-[var(--border-subtle)] overflow-hidden py-2 flex items-center relative shadow-inner">
      <div className="absolute left-0 w-20 h-full bg-gradient-to-r from-[#022c22] to-transparent z-10 pointer-events-none"></div>
      
      <div className="flex whitespace-nowrap min-w-full">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 20,
          }}
          className="flex items-center gap-12 px-6"
        >
          {/* Double the array for seamless infinite scroll */}
          {[...MOCK_MATCHES, ...MOCK_MATCHES].map((m, idx) => (
            <div key={idx} className="flex items-center gap-4 text-sm font-bold uppercase tracking-widest text-white/80">
              <span className="text-[var(--color-brand)] w-2 h-2 rounded-full animate-pulse bg-[var(--color-brand)]"></span>
              <span>{m.match}</span>
              <span className="text-white/50">{m.time}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="absolute right-0 w-20 h-full bg-gradient-to-l from-[#022c22] to-transparent z-10 pointer-events-none"></div>
    </div>
  );
}
