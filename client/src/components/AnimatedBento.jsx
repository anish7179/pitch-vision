import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Database, Zap, Map } from 'lucide-react';
import MagicCard from './ui/MagicCard';

const bentoItems = [
  {
    title: "Phase 4 Engine",
    desc: "Proprietary FastAPI backend processing 100k+ positional data points per second with Kernel Density Estimation.",
    colSpan: "col-span-1 md:col-span-2",
    rowSpan: "row-span-2",
    icon: <Database size={32} className="text-[var(--color-brand)] mb-4" />,
    gradient: "rgba(16, 185, 129, 0.2)", // green
    image: (
      <div className="absolute -bottom-10 -right-10 w-64 h-64 border border-[var(--color-brand)]/30 rounded-full flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform duration-700">
        <div className="w-48 h-48 border border-[var(--color-brand)]/50 rounded-full flex items-center justify-center">
          <div className="w-32 h-32 border-2 border-[var(--color-brand)] rounded-full border-dashed animate-spin-slow"></div>
        </div>
      </div>
    )
  },
  {
    title: "Real-Time Tracking",
    desc: "Live websocket streaming directly to the 3D client.",
    colSpan: "col-span-1",
    rowSpan: "row-span-1",
    icon: <Zap size={24} className="text-blue-500 mb-4" />,
    gradient: "rgba(59, 130, 246, 0.15)", // blue
    image: null
  },
  {
    title: "Spatial Heatmaps",
    desc: "Interactive 3D overlays showing player density.",
    colSpan: "col-span-1",
    rowSpan: "row-span-1",
    icon: <Map size={24} className="text-orange-500 mb-4" />,
    gradient: "rgba(249, 115, 22, 0.15)", // orange
    image: null
  },
  {
    title: "Tactical Analytics",
    desc: "Compare passing networks and advanced xG metrics instantly.",
    colSpan: "col-span-1 md:col-span-3",
    rowSpan: "row-span-1",
    icon: <Activity size={24} className="text-purple-500 mb-4" />,
    gradient: "rgba(168, 85, 247, 0.15)", // purple
    image: (
      <div className="absolute right-0 bottom-0 w-1/2 h-full flex items-end gap-2 p-6 opacity-30 group-hover:opacity-100 transition-opacity duration-500">
        <motion.div initial={{ height: '20%' }} whileHover={{ height: '60%' }} className="w-8 bg-purple-500 rounded-t-sm transition-all"></motion.div>
        <motion.div initial={{ height: '40%' }} whileHover={{ height: '80%' }} className="w-8 bg-purple-500 rounded-t-sm transition-all"></motion.div>
        <motion.div initial={{ height: '70%' }} whileHover={{ height: '100%' }} className="w-8 bg-[var(--color-brand)] rounded-t-sm transition-all shadow-[0_0_15px_var(--color-brand)]"></motion.div>
      </div>
    )
  }
];

export default function AnimatedBento() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 20 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 my-16"
    >
      {bentoItems.map((item, idx) => (
        <motion.div 
          key={idx}
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          className={`relative ${item.colSpan} ${item.rowSpan} group`}
        >
          <MagicCard 
            className="w-full h-full p-8"
            gradientColor={item.gradient}
            gradientSize={300}
            gradientOpacity={1}
          >
            <div className="relative z-10 flex flex-col h-full">
              {item.icon}
              <h3 className="text-2xl font-display font-black text-[var(--text-main)] mb-2 tracking-tight uppercase">
                {item.title}
              </h3>
              <p className="text-[var(--text-muted)] font-medium max-w-sm">
                {item.desc}
              </p>
            </div>
            {item.image}
          </MagicCard>
        </motion.div>
      ))}
    </motion.div>
  );
}
