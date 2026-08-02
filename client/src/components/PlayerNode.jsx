import React from 'react';
import { cn } from '../utils/cn';
import { ArrowUp, ArrowDown } from 'lucide-react';

const PlayerNode = ({ player, onClick, isSelected }) => {
  const { name, rating, isSubbedOn, isSubbedOff } = player;
  
  const getBadgeColor = (rating) => {
    if (!rating) return 'bg-gray-500';
    if (rating < 6.0) return 'bg-red-500';
    if (rating < 7.0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center cursor-pointer group hover:scale-110 transition-transform w-full h-full"
      onClick={() => onClick(player)}
    >
      <div className="relative">
        <div className={cn(
          "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center overflow-hidden shadow-lg transition-colors border-2",
          isSelected ? "bg-(--color-brand) border-white text-white" : "bg-zinc-800 border-white/20 group-hover:border-(--color-brand)"
        )}>
          <span className="text-white font-bold text-xs md:text-sm">
            {(() => {
              const tokens = name.split(/[\s_]+/).filter(Boolean);
              if (tokens.length >= 2) return (tokens[0][0] + tokens[1][0]).toUpperCase();
              return (tokens[0] || '??').substring(0, 2).toUpperCase();
            })()}
          </span>
        </div>
        
        {/* Rating Badge */}
        {rating && (
          <div className={cn(
            "absolute -bottom-1 -right-1 text-[9px] md:text-[10px] font-bold text-white px-1.5 py-0.5 rounded-md shadow-sm border border-white/20",
            getBadgeColor(rating)
          )}>
            {typeof rating === 'number' ? rating.toFixed(1) : rating}
          </div>
        )}

        {/* Sub Indicators */}
        {isSubbedOff && (
          <div className="absolute -top-1 -right-1 bg-zinc-900 rounded-full border border-zinc-700 p-0.5">
            <ArrowDown className="w-3 h-3 text-red-500" strokeWidth={3} />
          </div>
        )}
        {isSubbedOn && (
          <div className="absolute -top-1 -left-1 bg-zinc-900 rounded-full border border-zinc-700 p-0.5">
            <ArrowUp className="w-3 h-3 text-green-500" strokeWidth={3} />
          </div>
        )}
      </div>
      
      <div className="mt-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] md:text-[10px] font-semibold text-white text-center max-w-20 truncate shadow-sm">
        {name.split(/[\s_]+/).filter(Boolean).pop() || name}
      </div>
    </div>
  );
};

export default PlayerNode;
