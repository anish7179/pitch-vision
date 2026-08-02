import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Abstract3DPitch() {
  const groupRef = useRef();
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Slow cinematic rotation
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    
    // Gentle bobbing
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
  });

  return (
    <group ref={groupRef} rotation={[0.4, 0.4, 0]}>
      {/* Base Grid / Pitch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 14, 20, 14]} />
        <meshBasicMaterial 
          color="#34d399" 
          wireframe={true} 
          transparent 
          opacity={0.15} 
        />
      </mesh>

      {/* Center Circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.9, 2, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>

      {/* Halfway Line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.05, 14]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.4} />
      </mesh>

      {/* Penalty Areas */}
      {[-10, 10].map((x, i) => (
        <group key={i}>
          {/* Box */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x > 0 ? x - 1.5 : x + 1.5, 0.01, 0]}>
            <planeGeometry args={[3, 6]} />
            <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.3} />
          </mesh>
          {/* Goal */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 0]}>
            <planeGeometry args={[0.5, 2]} />
            <meshBasicMaterial color="#34d399" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}

      {/* Data Nodes (Abstract players/events) */}
      {[...Array(12)].map((_, i) => (
        <mesh 
          key={`node-${i}`} 
          position={[
            (Math.random() - 0.5) * 18, 
            0.1 + Math.random() * 0.5, 
            (Math.random() - 0.5) * 12
          ]}
        >
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial 
            color={i % 2 === 0 ? "#10b981" : "#0ea5e9"} 
            transparent 
            opacity={0.8}
            wireframe 
          />
        </mesh>
      ))}
    </group>
  );
}
