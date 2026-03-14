import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

// --- Configuration & Constants ---
const NODE_COUNT = 1200;
const CONNECTION_COUNT = 160;
const BRAIN_SCALE = 2.8;
const SCATTER_RADIUS = 20;

const COLORS = {
  electricBlue: new THREE.Color('#5AA9FF'),
  indigo: new THREE.Color('#7C9DFF'),
  softViolet: new THREE.Color('#A78BFA'),
  bg: '#02040A'
};

// --- Helper for organic brain shape ---
function getBrainPoint(i, count) {
  const isRight = i > count / 2;
  const phi = Math.random() * Math.PI * 2;
  const theta = Math.random() * Math.PI;

  let rx = 1.15, ry = 1.0, rz = 0.85;
  let x = rx * Math.cos(phi) * Math.sin(theta) + (isRight ? 0.35 : -0.35);
  let y = ry * Math.sin(phi) * Math.sin(theta);
  let z = rz * Math.cos(theta);

  const folds = 0.12 * Math.sin(phi * 8) * Math.sin(theta * 6);
  const pinch = 1.0 - 0.2 * Math.exp(-Math.pow(y * 1.5, 2)); 
  
  x *= (1 + folds) * pinch;
  y *= (1 + folds);
  z *= (1 + folds) * pinch;

  return new THREE.Vector3(x * BRAIN_SCALE, y * BRAIN_SCALE, z * BRAIN_SCALE);
}

// --- Component: Dynamic Neural Network ---
function NeuralNetwork({ progress }) {
  const pointsRef = useRef();
  const shellRef = useRef(); 
  const lineRef = useRef();
  const pulseRef = useRef();
  
  const [tVal, setTVal] = useState(typeof progress === 'number' ? progress : 0);

  // Sync tVal: if progress is a real MotionValue, subscribe to it;
  // if it's a plain number, just update via effect.
  useEffect(() => {
    if (typeof progress === 'number') {
      setTVal(progress);
      return;
    }
    // It's a MotionValue — subscribe to changes
    if (progress && typeof progress.on === 'function') {
      const unsub = progress.on('change', (v) => setTVal(v));
      return unsub;
    }
  }, [progress]);

  const getProgress = () => {
    return typeof progress === 'object' && progress.get ? progress.get() : (typeof progress === 'number' ? progress : tVal);
  };

  // 1. Generate Buffer Data (Pre-calculate for zero-lag)
  const data = useMemo(() => {
    const targets = new Float32Array(NODE_COUNT * 3);
    const scattered = new Float32Array(NODE_COUNT * 3);
    const cols = new Float32Array(NODE_COUNT * 3);
    const palette = [COLORS.electricBlue, COLORS.indigo, COLORS.softViolet];

    for (let i = 0; i < NODE_COUNT; i++) {
      const pos = getBrainPoint(i, NODE_COUNT);
      targets[i * 3] = pos.x;
      targets[i * 3 + 1] = pos.y;
      targets[i * 3 + 2] = pos.z;

      const angle = Math.random() * Math.PI * 2;
      const radius = SCATTER_RADIUS * (0.5 + Math.random() * 0.5);
      scattered[i * 3] = Math.cos(angle) * radius;
      scattered[i * 3 + 1] = (Math.random() - 0.5) * SCATTER_RADIUS;
      scattered[i * 3 + 2] = Math.sin(angle) * radius;

      const color = palette[Math.floor(Math.random() * palette.length)];
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }

    // Connections: Pre-calculate indices for LineSegments
    const lineIndices = [];
    const connectionSeeds = []; // For pulse animations
    for (let i = 0; i < CONNECTION_COUNT; i++) {
        const p1 = Math.floor(Math.random() * NODE_COUNT);
        const p2 = Math.floor(Math.random() * NODE_COUNT);
        lineIndices.push(p1, p2);
        connectionSeeds.push({
            p1, p2,
            speed: 0.5 + Math.random() * 1.5,
            offset: Math.random() * 10
        });
    }

    return { 
        targets, 
        scattered, 
        colors: cols, 
        lineIndices, 
        connectionSeeds,
        linePositions: new Float32Array(CONNECTION_COUNT * 2 * 3),
        pulsePositions: new Float32Array(CONNECTION_COUNT * 3),
        pulseColors: new Float32Array(CONNECTION_COUNT * 3)
    };
  }, []);

  // 2. Optimized Animation Loop
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const p = getProgress();
    const t = THREE.MathUtils.smoothstep(p, 0.0, 1.0); 
    
    // Update Node Vertices
    if (pointsRef.current && shellRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position;
      const shellAttr = shellRef.current.geometry.attributes.position;
      const positions = posAttr.array;
      const shellPositions = shellAttr.array;
      
      for (let i = 0; i < NODE_COUNT; i++) {
        const idx = i * 3;
        const angleOffset = (1 - t) * 4.0;
        const sX = data.scattered[idx];
        const sZ = data.scattered[idx + 2];
        
        const rotatedX = sX * Math.cos(angleOffset) - sZ * Math.sin(angleOffset);
        const rotatedZ = sX * Math.sin(angleOffset) + sZ * Math.cos(angleOffset);

        const assembleNoise = Math.sin(time * 0.5 + i) * 0.08 * (1 - t);
        
        positions[idx] = THREE.MathUtils.lerp(rotatedX, data.targets[idx], t) + assembleNoise;
        positions[idx + 1] = THREE.MathUtils.lerp(data.scattered[idx + 1], data.targets[idx + 1], t) + assembleNoise;
        positions[idx + 2] = THREE.MathUtils.lerp(rotatedZ, data.targets[idx + 2], t) + assembleNoise;

        shellPositions[idx] = positions[idx] * 1.015;
        shellPositions[idx + 1] = positions[idx + 1] * 1.015;
        shellPositions[idx + 2] = positions[idx + 2] * 1.015;
      }
      
      posAttr.needsUpdate = true;
      shellAttr.needsUpdate = true;
      
      // Batch Update Synaptic Lines
      if (lineRef.current) {
          const lineAttr = lineRef.current.geometry.attributes.position;
          const linePos = lineAttr.array;
          const globalAlpha = THREE.MathUtils.smoothstep(t, 0.3, 0.8);
          
          for(let i = 0; i < CONNECTION_COUNT; i++) {
              const p1Idx = data.lineIndices[i * 2] * 3;
              const p2Idx = data.lineIndices[i * 2 + 1] * 3;
              
              const startIdx = i * 6;
              linePos[startIdx] = positions[p1Idx];
              linePos[startIdx + 1] = positions[p1Idx + 1];
              linePos[startIdx + 2] = positions[p1Idx + 2];
              
              linePos[startIdx + 3] = positions[p2Idx];
              linePos[startIdx + 4] = positions[p2Idx + 1];
              linePos[startIdx + 5] = positions[p2Idx + 2];
          }
          lineAttr.needsUpdate = true;
          lineRef.current.material.opacity = globalAlpha * 0.25;
      }

      // Batch Update Traveling Pulses
      if (pulseRef.current) {
          const pulseAttr = pulseRef.current.geometry.attributes.position;
          const pulsePos = pulseAttr.array;
          const pulseColAttr = pulseRef.current.geometry.attributes.color;
          const pulseCols = pulseColAttr.array;
          const globalPulseAlpha = THREE.MathUtils.smoothstep(t, 0.4, 0.85);

          for(let i = 0; i < CONNECTION_COUNT; i++) {
              const seed = data.connectionSeeds[i];
              const p1Idx = seed.p1 * 3;
              const p2Idx = seed.p2 * 3;
              
              const cycle = (time * seed.speed + seed.offset) % 1.0;
              const idx = i * 3;
              
              pulsePos[idx] = THREE.MathUtils.lerp(positions[p1Idx], positions[p2Idx], cycle);
              pulsePos[idx + 1] = THREE.MathUtils.lerp(positions[p1Idx + 1], positions[p2Idx + 1], cycle);
              pulsePos[idx + 2] = THREE.MathUtils.lerp(positions[p1Idx + 2], positions[p2Idx + 2], cycle);
              
              // Pulsing glow intensity
              const intensity = Math.sin(time * 4 + seed.offset) * 0.5 + 0.5;
              pulseCols[idx] = 0.6 + intensity * 0.4; // Violet/Indigo mix
              pulseCols[idx + 1] = 0.4 + intensity * 0.6;
              pulseCols[idx + 2] = 1.0;
          }
          pulseAttr.needsUpdate = true;
          pulseColAttr.needsUpdate = true;
          pulseRef.current.material.opacity = globalPulseAlpha * 0.8;
      }

      const rotationSpeed = 0.12 + t * 0.08;
      pointsRef.current.rotation.y = time * rotationSpeed;
      shellRef.current.rotation.y = time * rotationSpeed;
      if (lineRef.current) lineRef.current.rotation.y = time * rotationSpeed;
      if (pulseRef.current) pulseRef.current.rotation.y = time * rotationSpeed;
    }
  });

  return (
    <group>
      {/* 1. Neural Nodes (Batched Points) */}
      <Points ref={pointsRef} positions={data.scattered} colors={data.colors} stride={3}>
        <PointMaterial
          transparent
          vertexColors
          size={0.14}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.8}
        />
      </Points>

      <Points ref={shellRef} positions={data.scattered} colors={data.colors} stride={3}>
        <PointMaterial
          transparent
          vertexColors
          size={0.28}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.15}
        />
      </Points>

      {/* 2. Synaptic Connections (Batched LineSegments) */}
      <lineSegments ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={data.linePositions.length / 3}
            array={data.linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#7C9DFF"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* 3. Neural Firing Pulses (Batched Points) */}
      <Points ref={pulseRef} positions={data.pulsePositions} colors={data.pulseColors} stride={3}>
        <PointMaterial
          transparent
          vertexColors
          size={0.18}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0}
        />
      </Points>
    </group>
  );
}

// --- Main Export ---
export default function Brain3D({ progress = 0 }) {
  return (
    <div className="brain-dynamic-canvas" style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        zIndex: 1, 
        background: 'transparent',
        pointerEvents: 'none'
    }}>
      <Canvas 
        camera={{ position: [0, 0, 14], fov: 40 }}
        dpr={[1, 2]} 
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} intensity={1.5} color={COLORS.electricBlue} />
        <spotLight position={[-10, -10, -10]} intensity={1.5} color={COLORS.softViolet} />
        
        <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.3}>
          <NeuralNetwork progress={progress} />
        </Float>

        <StarsBackground />
      </Canvas>
    </div>
  );
}

function StarsBackground() {
    const starRef = useRef();
    const count = 1500;
    const [positions] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for(let i=0; i<count; i++) {
            pos[i*3] = (Math.random() - 0.5) * 60;
            pos[i*3+1] = (Math.random() - 0.5) * 60;
            pos[i*3+2] = (Math.random() - 0.5) * 60;
        }
        return [pos];
    }, []);

    useFrame((state) => {
        if (starRef.current) {
            starRef.current.rotation.y = state.clock.getElapsedTime() * 0.015;
        }
    });

    return (
        <Points ref={starRef} positions={positions}>
            <PointMaterial 
                transparent 
                color="#ffffff" 
                size={0.02} 
                sizeAttenuation 
                depthWrite={false} 
                opacity={0.06}
            />
        </Points>
    );
}
