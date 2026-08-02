import React from 'react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

export default function BorderBeam({
  className,
  size = 200,
  duration = 10,
  colorFrom = '#10b981', // green-500
  colorTo = 'transparent',
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]',
        className
      )}
      style={{
        '--border-width': '2',
      }}
    >
      <div
        className="absolute inset-[0] rounded-[inherit] [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
      >
        <motion.div
          animate={{
            transform: ['rotate(0deg)', 'rotate(360deg)'],
          }}
          transition={{
            duration: duration,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute aspect-square bg-[conic-gradient(from_0deg,var(--color-from),var(--color-to)_25%)]"
          style={{
            width: size,
            left: '50%',
            top: '50%',
            marginLeft: -size / 2,
            marginTop: -size / 2,
            '--color-from': colorFrom,
            '--color-to': colorTo,
          }}
        />
      </div>
    </div>
  );
}
