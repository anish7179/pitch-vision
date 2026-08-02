import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full bg-[#050505] border-t border-zinc-800 py-12 px-10 text-zinc-400 font-sans mt-auto z-20">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* Brand Summary */}
        <div className="flex flex-col gap-4">
          <Link to="/" className="text-3xl font-black tracking-tight text-white flex items-center gap-2 uppercase font-display">
            <span className="text-green-500 rounded-full">⚽</span> Pitch<span className="text-green-500">Vision</span>
          </Link>
          <p className="text-sm text-zinc-500 max-w-xs">
            The ultimate tactical analysis and live-tracking platform for elite performance.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-4">
          <h3 className="text-white font-bold tracking-widest uppercase text-sm mb-2">Quick Links</h3>
          <Link to="/matches" className="text-sm hover:text-green-500 transition-colors">Matches</Link>
          <Link to="/teams" className="text-sm hover:text-green-500 transition-colors">Teams</Link>
          <Link to="/leagues" className="text-sm hover:text-green-500 transition-colors">Leagues</Link>
          <Link to="/players" className="text-sm hover:text-green-500 transition-colors">Players</Link>
        </div>

        {/* Support / FAQ */}
        <div className="flex flex-col gap-4">
          <h3 className="text-white font-bold tracking-widest uppercase text-sm mb-2">Support</h3>
          <Link to="#" className="text-sm hover:text-green-500 transition-colors">Help Center</Link>
          <Link to="#" className="text-sm hover:text-green-500 transition-colors">API Documentation</Link>
          <Link to="#" className="text-sm hover:text-green-500 transition-colors">Privacy Policy</Link>
          <Link to="#" className="text-sm hover:text-green-500 transition-colors">Terms of Service</Link>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col gap-4">
          <h3 className="text-white font-bold tracking-widest uppercase text-sm mb-2">Connect</h3>
          <a href="#" className="text-sm hover:text-green-500 transition-colors">Email Support</a>
          <a href="#" className="text-sm hover:text-green-500 transition-colors">Twitter / X</a>
          <a href="#" className="text-sm hover:text-green-500 transition-colors">GitHub</a>
        </div>
        
      </div>

      <div className="w-full max-w-7xl mx-auto mt-12 pt-8 border-t border-zinc-900 flex justify-center items-center">
        <p className="text-xs text-zinc-600">
          &copy; 2026 PitchVision. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
