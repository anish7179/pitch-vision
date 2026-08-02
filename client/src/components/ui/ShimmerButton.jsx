import React from 'react';
import { cn } from '../../utils/cn';

export default function ShimmerButton({
  className,
  children,
  background = 'var(--color-brand)',
  shimmerColor = 'rgba(255, 255, 255, 0.4)',
  shimmerSize = '3px',
  shimmerDuration = '3s',
  ...props
}) {
  return (
    <>
      <style>
        {`
          @keyframes shimmer-slide {
            from {
              transform: translateX(-100%) skewX(-15deg);
            }
            to {
              transform: translateX(200%) skewX(-15deg);
            }
          }
          .animate-shimmer-slide {
            animation: shimmer-slide var(--shimmer-duration) infinite linear;
          }
        `}
      </style>

      <button
        className={cn(
          'group relative overflow-hidden rounded-xl px-8 py-4 font-bold uppercase tracking-widest text-sm text-[var(--bg-primary)] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_var(--color-brand)] hover:shadow-[0_0_30px_var(--color-brand)]',
          className
        )}
        style={{
          background: background,
          '--shimmer-duration': shimmerDuration,
        }}
        {...props}
      >
        {/* Shimmer effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ overflow: 'hidden', borderRadius: 'inherit' }}
        >
          <div
            className="animate-shimmer-slide h-full w-[50px] bg-gradient-to-r from-transparent via-[var(--shimmer-color)] to-transparent"
            style={{
              '--shimmer-color': shimmerColor,
            }}
          />
        </div>

        {/* Content */}
        <span className="relative z-10 flex items-center justify-center gap-2 w-full">
          {children}
        </span>
      </button>
    </>
  );
}
