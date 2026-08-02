import React, { useRef, useState, useEffect } from 'react';
import { cn } from '../../utils/cn';

export default function MagicCard({
  children,
  className,
  gradientSize = 250,
  gradientColor = 'rgba(16, 185, 129, 0.15)', // var(--color-brand) roughly
  gradientOpacity = 0.8,
  ...props
}) {
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    if (isHovered && cardRef.current) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isHovered]);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] shadow-sm transition-colors hover:border-[var(--color-brand)]',
        className
      )}
      {...props}
    >
      {/* Radial Gradient overlay */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? gradientOpacity : 0,
          background: `radial-gradient(${gradientSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${gradientColor}, transparent 100%)`,
        }}
      />
      
      {/* Content wrapper */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}
