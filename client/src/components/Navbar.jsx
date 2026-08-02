import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Trophy, Users, Shield, User, Sun, Moon, LogIn, Activity } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();

  const navLinks = [
    { path: '/matches', label: 'Matches', icon: <Activity size={18} /> },
    { path: '/teams', label: 'Teams', icon: <Shield size={18} /> },
    { path: '/leagues', label: 'Leagues', icon: <Trophy size={18} /> },
    { path: '/players', label: 'Players', icon: <User size={18} /> },
  ];

  return (
    <nav className="w-full pointer-events-auto bg-[var(--bg-panel)] border-b border-[var(--border-subtle)] px-8 py-4 flex justify-between items-center fixed top-0 z-50 font-sans shadow-sm transition-colors duration-300">
      <Link to="/" className="text-2xl font-display font-black tracking-tight text-[var(--text-main)] flex items-center gap-2 uppercase">
        <span className="text-[var(--color-brand)] bg-[var(--bg-secondary)] p-1.5 rounded-md">⚽</span> 
        Pitch<span className="text-[var(--color-brand)]">Vision</span>
      </Link>
      
      <div className="flex items-center gap-8 text-sm font-bold tracking-widest uppercase">
        <div className="flex items-center gap-2 bg-[var(--bg-secondary)] p-1.5 rounded-lg border border-[var(--border-subtle)]">
          {navLinks.map(link => {
            const isActive = location.pathname === link.path;
            return (
              <Link 
                key={link.path} 
                to={link.path} 
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-300 ${
                  isActive 
                    ? 'bg-[var(--bg-panel)] text-[var(--color-brand)] shadow-sm' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-main)] hover:border-[var(--color-brand)] transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <Link 
            to="/login" 
            className="flex items-center gap-2 bg-[var(--color-brand)] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[var(--color-brand-hover)] transition-colors"
          >
            <LogIn size={18} />
            <span>Login</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
