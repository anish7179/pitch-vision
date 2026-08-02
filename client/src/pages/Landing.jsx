import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, Newspaper, ChevronRight, Activity, ArrowRight, PlayCircle, Star, BookOpen } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import Abstract3DPitch from '../components/Abstract3DPitch';
import AnimatedBento from '../components/AnimatedBento';
import ScrollingTicker from '../components/ScrollingTicker';
import Meteors from '../components/ui/Meteors';
import BorderBeam from '../components/ui/BorderBeam';
import ShimmerButton from '../components/ui/ShimmerButton';

export default function Landing() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };
  
  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants}
      className="w-full flex flex-col font-sans gap-12"
    >
      
      {/* Tier 1: Cinematic 3D Hero */}
      <div className="w-full flex flex-col items-center justify-center text-center py-32 md:py-40 bg-(--bg-panel) rounded-3xl shadow-sm mt-8 relative overflow-hidden min-h-150 md:min-h-175 group">
        
        {/* Animated Border Beam */}
        <BorderBeam size={350} duration={8} colorFrom="#10b981" />

        {/* Meteor Particle Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <Meteors number={25} />
        </div>

        {/* Abstract Background Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-(--color-brand)/10 via-(--bg-panel) to-(--bg-panel) opacity-50 z-0"></div>

        {/* 3D Abstract Pitch Background */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen">
          <Canvas camera={{ position: [0, 8, 12], fov: 50, near: 0.1, far: 1000 }}>
            <ambientLight intensity={1} />
            <directionalLight position={[10, 20, 10]} intensity={2} color="#34d399" />
            <Abstract3DPitch />
          </Canvas>
        </div>
        
        <motion.div variants={itemVariants} className="relative z-10 flex flex-col items-center max-w-4xl px-4 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-(--bg-secondary)/80 backdrop-blur-md border border-(--border-subtle) text-xs font-bold uppercase tracking-widest text-(--text-main) mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-(--color-brand) opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-(--color-brand)"></span>
            </span>
            Pitch Vision OS 2.0
          </div>
          
          <h1 className="text-6xl md:text-8xl font-display font-black text-(--text-main) uppercase tracking-tighter leading-[0.9] drop-shadow-xl">
            Spatial <span className="text-(--color-brand) drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">Intelligence</span><br/>For The Modern Game.
          </h1>
          
          <p className="mt-8 text-lg md:text-xl text-(--text-muted) font-medium max-w-2xl leading-relaxed">
            The world's most advanced 3D tactical analysis platform. Real-time data processing, spatial KDE heatmaps, and next-generation player insights.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full justify-center pointer-events-auto">
            <Link to="/leagues">
              <ShimmerButton background="var(--color-brand)" shimmerColor="rgba(255,255,255,0.4)">
                Initialize Engine <ArrowRight size={18} />
              </ShimmerButton>
            </Link>
            <Link to="/login" className="px-8 py-4 bg-(--bg-secondary)/80 backdrop-blur-md border border-(--border-subtle) text-(--text-main) font-bold rounded-xl hover:border-(--color-brand) hover:text-(--color-brand) transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-sm relative overflow-hidden group/btn">
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-(--color-brand)/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer-slide_1.5s_infinite] pointer-events-none"></div>
              <BookOpen size={18} /> Read The Docs
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Infinite Scrolling Match Ticker */}
      <motion.div variants={itemVariants} className="w-full mb-8">
        <ScrollingTicker />
      </motion.div>

      {/* Animated Bento Grid */}
      <AnimatedBento />


      {/* Tier 2: Your Feed & Live Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Feed */}
        <motion.div variants={itemVariants} className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-display uppercase tracking-tight text-(--text-main) flex items-center gap-2">
              <Star className="text-(--color-brand)" size={24} />
              Your Feed
            </h2>
            <Link to="/teams" className="text-sm font-bold text-(--text-muted) hover:text-(--color-brand) flex items-center gap-1 transition-colors">
              Manage <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Followed Team Match Card */}
            <Link to="/match/5" className="bg-(--bg-panel) border border-(--border-subtle) rounded-2xl overflow-hidden hover:border-(--color-brand) transition-all group flex flex-col cursor-pointer shadow-sm">
              <div className="bg-(--bg-secondary) px-5 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-(--text-main) text-sm tracking-widest uppercase">Manchester City</span>
                </div>
                <span className="text-(--color-brand) text-[10px] font-black uppercase tracking-widest bg-(--color-brand)/10 px-2 py-0.5 rounded-sm">
                  Following
                </span>
              </div>
              
              <div className="p-6 flex justify-between items-center bg-(--bg-panel)">
                <div className="flex flex-col items-center gap-2">
                  <span className="font-display font-black text-3xl text-(--text-main)">MCI</span>
                </div>
                
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="text-[10px] font-black text-(--text-muted) uppercase tracking-widest">Full Time</span>
                  <div className="bg-(--bg-secondary) border border-(--border-subtle) px-6 py-2 rounded-lg">
                    <span className="text-3xl font-display font-black text-(--text-main) tracking-widest">3 - 1</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <span className="font-display font-bold text-2xl text-(--text-main)">AVL</span>
                </div>
              </div>
            </Link>

            {/* Followed Player News Card */}
            <div className="bg-(--bg-panel) border border-(--border-subtle) rounded-2xl p-5 hover:border-(--color-brand) transition-all group flex flex-col justify-between cursor-pointer shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-(--color-brand) text-[10px] font-black uppercase tracking-widest bg-(--color-brand)/10 px-2 py-0.5 rounded-sm">Following</span>
                  <span className="font-sans font-bold text-(--text-muted) text-[10px] tracking-widest uppercase">Erling Haaland</span>
                </div>
                <Newspaper size={16} className="text-(--text-muted)" />
              </div>
              <h3 className="text-xl font-display font-bold text-(--text-main) leading-tight group-hover:text-(--color-brand) transition-colors">
                Haaland bags a brace to secure all three points for City
              </h3>
              <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest mt-4">2 Hours Ago</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Live Now */}
        <motion.div variants={itemVariants} className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-display uppercase tracking-tight text-(--text-main) flex items-center gap-2">
              <Activity className="text-(--color-brand)" size={24} />
              Live Now
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">3 Matches</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Live Match 1 */}
            <Link to="/match/1" className="bg-(--bg-panel) border-l-4 border-l-red-500 border-y border-r border-(--border-subtle) rounded-xl p-4 hover:border-r-red-500 hover:border-y-red-500 transition-all cursor-pointer shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Premier League</span>
                <span className="text-xs font-bold text-red-500 animate-pulse">67'</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-(--text-main)">Arsenal</span>
                    <span className="font-display font-black text-xl text-(--text-main)">2</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-(--text-main)">Chelsea</span>
                    <span className="font-display font-black text-xl text-(--text-main)">1</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Live Match 2 */}
            <Link to="/match/2" className="bg-(--bg-panel) border-l-4 border-l-red-500 border-y border-r border-(--border-subtle) rounded-xl p-4 hover:border-r-red-500 hover:border-y-red-500 transition-all cursor-pointer shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">La Liga</span>
                <span className="text-xs font-bold text-red-500 animate-pulse">HT</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-(--text-main)">Real Madrid</span>
                    <span className="font-display font-black text-xl text-(--text-main)">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-(--text-main)">Barcelona</span>
                    <span className="font-display font-black text-xl text-(--text-main)">0</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Tier 3: Top Stories Grid */}
      <motion.div variants={itemVariants} className="w-full flex flex-col mt-4 mb-12">
        <h2 className="text-2xl font-bold font-display uppercase tracking-tight text-(--text-main) mb-6 flex items-center gap-2">
          <TrendingUp className="text-(--color-brand)" size={24} />
          Trending News
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { category: 'Transfers', title: 'Mbappé Signs Historic New Contract with Madrid' },
            { category: 'Champions League', title: 'Group of Death Confirmed in UEFA Draw' },
            { category: 'Injuries', title: 'De Bruyne Sidelined for 6 Weeks Following Clash' }
          ].map((news, i) => (
            <div key={i} className="bg-(--bg-panel) border border-(--border-subtle) rounded-2xl flex flex-col hover:border-(--color-brand) transition-all cursor-pointer group shadow-sm overflow-hidden">
              <div className="p-6 flex flex-col justify-center h-full">
                <span className="text-[10px] font-black text-(--text-main) bg-(--bg-secondary) border border-(--border-subtle) px-3 py-1 rounded-full uppercase tracking-widest self-start mb-4">
                  {news.category}
                </span>
                <h4 className="text-(--text-main) font-display font-bold leading-tight text-xl mb-4 group-hover:text-(--color-brand) transition-colors">
                  {news.title}
                </h4>
                <div className="mt-auto flex items-center justify-between text-(--text-muted)">
                  <span className="text-[10px] font-bold uppercase tracking-widest">2 hours ago</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform text-(--color-brand)" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
