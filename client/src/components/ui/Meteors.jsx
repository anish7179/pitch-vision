import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';

export default function Meteors({
  number = 20,
  className,
}) {
  const [meteors, setMeteors] = useState([]);

  useEffect(() => {
    // Generate static meteors only on client side to avoid hydration mismatch
    const generatedMeteors = new Array(number).fill(true).map(() => ({
      id: Math.random().toString(),
      left: Math.floor(Math.random() * 100) + '%',
      animationDelay: Math.random() * (0.8 - 0.2) + 0.2 + 's',
      animationDuration: Math.floor(Math.random() * (10 - 2) + 2) + 's',
    }));
    setMeteors(generatedMeteors);
  }, [number]);

  return (
    <>
      {/* Meteor CSS keyframes */}
      <style>
        {`
          @keyframes meteor {
            0% {
              transform: rotate(215deg) translateX(0);
              opacity: 1;
            }
            70% {
              opacity: 1;
            }
            100% {
              transform: rotate(215deg) translateX(-1000px);
              opacity: 0;
            }
          }
          .animate-meteor-effect {
            animation: meteor 5s linear infinite;
          }
        `}
      </style>
      
      {meteors.map((el) => (
        <span
          key={el.id}
          className={cn(
            'animate-meteor-effect absolute top-[-10%] left-[50%] h-[1px] w-[50px] shadow-[0_0_0_1px_#ffffff10]',
            'bg-gradient-to-r from-[var(--color-brand)] to-transparent',
            className
          )}
          style={{
            top: 0,
            left: el.left,
            animationDelay: el.animationDelay,
            animationDuration: el.animationDuration,
          }}
        >
          {/* Meteor head */}
          <div className="absolute top-[50%] left-[0] h-[2px] w-[2px] -translate-y-[50%] rounded-full bg-[var(--color-brand)] shadow-[0_0_10px_2px_rgba(16,185,129,0.8)]"></div>
        </span>
      ))}
    </>
  );
}
