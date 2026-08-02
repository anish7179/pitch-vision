import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function PitchGrass({ count = 200000 }) {
  const meshRef = useRef();
  const planeRef = useRef();

  const shaderUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector3(9999, 0, 9999) },
      uMouseDelta: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  const mouseState = useMemo(() => ({
    lastPos: new THREE.Vector3(9999, 0, 9999),
    velocity: new THREE.Vector2(0, 0),
  }), []);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.35, 0.9, 1, 12);
    geo.translate(0, 0.45, 0); 
    
    const positions = geo.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      const normalizedY = y / 0.9;
      const widthFactor = 1.0 - Math.pow(normalizedY, 1.5); 
      positions[i] *= widthFactor;
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ 
      color: '#10b981', 
      roughness: 0.9,
      side: THREE.DoubleSide
    });
    
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = shaderUniforms.uTime;
      shader.uniforms.uMouse = shaderUniforms.uMouse;
      shader.uniforms.uMouseDelta = shaderUniforms.uMouseDelta;

      shader.vertexShader = `
        uniform float uTime;
        uniform vec3 uMouse;
        uniform vec2 uMouseDelta;
        varying vec2 vMyUv;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        
        vMyUv = uv;
        
        vec3 instancePos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec2 bladeVec = instancePos.xz - uMouse.xz;
        float dist = length(bladeVec);
        
        float distInfluence = 1.0 - smoothstep(0.0, 3.0, dist);
        float dirInfluence = 0.0;
        float deltaLen = length(uMouseDelta);
        
        if (deltaLen > 0.0001 && dist > 0.0001) {
            vec2 normDelta = normalize(uMouseDelta);
            vec2 normBlade = normalize(bladeVec);
            dirInfluence = smoothstep(0.1, 0.8, dot(normDelta, normBlade));
        }
        
        float influence = distInfluence * dirInfluence;
        float heightFactor = max(0.0, position.y);
        vec2 displacement = uMouseDelta * influence * 10.0;
        
        // Apply wind and displacement
        float wind = sin(uTime * 2.0 + instancePos.x * 0.5 + instancePos.z * 0.5) * 0.2;
        transformed.x += (displacement.x + wind) * heightFactor;
        transformed.z += (displacement.y + wind) * heightFactor;
        transformed.y -= length(displacement) * heightFactor * 0.6;
        `
      );

      shader.fragmentShader = `
        varying vec2 vMyUv;
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `
        vec3 rootColor = vec3(0.015, 0.20, 0.08); 
        vec3 tipColor = vec3(0.2, 0.55, 0.15); 
        vec3 finalColor = mix(rootColor, tipColor, vMyUv.y);
        
        float edge = abs(vMyUv.x - 0.5) * 2.0; 
        finalColor = mix(finalColor, finalColor * 0.35, edge * 0.8);
        
        vec4 diffuseColor = vec4( finalColor, opacity );
        `
      );
    };
    return mat;
  }, [shaderUniforms]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  React.useEffect(() => {
    if (!meshRef.current) return;
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      
      dummy.position.set(x, 0, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      const scale = 0.8 + Math.random() * 0.6;
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count, dummy]);

  const pointerPos = useRef(new THREE.Vector3(9999, 9999, 9999));
  const lastMouse = useRef(new THREE.Vector3(9999, 9999, 9999));
  const currentDelta = useRef(new THREE.Vector2(0, 0));

  useFrame((state) => {
    if (shaderUniforms.uTime) shaderUniforms.uTime.value = state.clock.elapsedTime;
    
    const target = pointerPos.current;
    
    if (target.x !== 9999) {
      if (lastMouse.current.x !== 9999) {
        currentDelta.current.x = target.x - lastMouse.current.x;
        currentDelta.current.y = target.z - lastMouse.current.z;
      }
      lastMouse.current.copy(target);
      if (shaderUniforms.uMouse) shaderUniforms.uMouse.value.copy(target);
    } else {
      currentDelta.current.set(0, 0);
      lastMouse.current.set(9999, 9999, 9999);
      if (shaderUniforms.uMouse) shaderUniforms.uMouse.value.set(9999, 9999, 9999);
    }

    if (shaderUniforms.uMouseDelta) {
      shaderUniforms.uMouseDelta.value.lerp(currentDelta.current, 0.15);
    }
  });

  return (
    <group>
      <mesh 
        ref={planeRef} 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow
        onPointerMove={(e) => { pointerPos.current.copy(e.point); }}
        onPointerOut={() => { pointerPos.current.set(9999, 9999, 9999); }}
      >
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#023014" roughness={0.9} />
      </mesh>
      
      <instancedMesh ref={meshRef} args={[geometry, material, count]} castShadow receiveShadow />
    </group>
  );
}
