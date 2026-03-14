import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

const NODE_COUNT = 120;
const STREAM_PARTICLE_COUNT = 400;

// --- Layer 1: Neural Nodes connected by synaptic lines ---
function NeuralNetwork() {
  const nodesRef = useRef();
  const linesRef = useRef();
  const streamRef = useRef();

  const data = useMemo(() => {
    // Generate node positions in a spread 3D web
    const nodePositions = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodePositions.push(new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 10
      ));
    }

    // Connect nearby nodes with lines
    const lineVerts = [];
    const connections = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dist = nodePositions[i].distanceTo(nodePositions[j]);
        if (dist < 6.5) {
          lineVerts.push(
            nodePositions[i].x, nodePositions[i].y, nodePositions[i].z,
            nodePositions[j].x, nodePositions[j].y, nodePositions[j].z
          );
          connections.push({ from: i, to: j, dist });
        }
      }
    }

    // Node glowing points buffer
    const nodeBuf = new Float32Array(NODE_COUNT * 3);
    const nodeColors = new Float32Array(NODE_COUNT * 3);
    const palette = [
      new THREE.Color('#5AA9FF'),
      new THREE.Color('#7C9DFF'),
      new THREE.Color('#A78BFA'),
      new THREE.Color('#60efff'),
    ];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodeBuf[i * 3] = nodePositions[i].x;
      nodeBuf[i * 3 + 1] = nodePositions[i].y;
      nodeBuf[i * 3 + 2] = nodePositions[i].z;
      const c = palette[Math.floor(Math.random() * palette.length)];
      nodeColors[i * 3] = c.r;
      nodeColors[i * 3 + 1] = c.g;
      nodeColors[i * 3 + 2] = c.b;
    }

    // Stream particles (data flowing between nodes)
    const streamSeeds = connections.slice(0, Math.min(connections.length, 60)).map(conn => ({
      from: nodePositions[conn.from],
      to: nodePositions[conn.to],
      speed: 0.3 + Math.random() * 0.5,
      offset: Math.random(),
    }));

    const streamBuf = new Float32Array(STREAM_PARTICLE_COUNT * 3);
    const streamColors = new Float32Array(STREAM_PARTICLE_COUNT * 3);
    const streamSeeds2 = [];
    for (let i = 0; i < STREAM_PARTICLE_COUNT; i++) {
      const seed = streamSeeds[i % streamSeeds.length];
      streamSeeds2.push({ ...seed, offset: Math.random() });
      const c = palette[i % palette.length];
      streamColors[i * 3] = c.r;
      streamColors[i * 3 + 1] = c.g;
      streamColors[i * 3 + 2] = c.b;
    }

    return {
      nodeBuf,
      nodeColors,
      lineVerts: new Float32Array(lineVerts),
      streamBuf,
      streamColors,
      streamSeeds: streamSeeds2,
    };
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Slowly rotate everything
    if (nodesRef.current) nodesRef.current.rotation.y = time * 0.04;
    if (linesRef.current) linesRef.current.rotation.y = time * 0.04;
    if (streamRef.current) {
      streamRef.current.rotation.y = time * 0.04;

      // Animate stream particles along their connection paths
      const pos = streamRef.current.geometry.attributes.position;
      for (let i = 0; i < STREAM_PARTICLE_COUNT; i++) {
        const seed = data.streamSeeds[i];
        const t = ((time * seed.speed + seed.offset) % 1.0);
        pos.array[i * 3] = THREE.MathUtils.lerp(seed.from.x, seed.to.x, t);
        pos.array[i * 3 + 1] = THREE.MathUtils.lerp(seed.from.y, seed.to.y, t);
        pos.array[i * 3 + 2] = THREE.MathUtils.lerp(seed.from.z, seed.to.z, t);
      }
      pos.needsUpdate = true;

      // Pulse brightness on stream particles
      const opacity = 0.55 + 0.2 * Math.sin(time * 2.5);
      streamRef.current.material.opacity = opacity;
    }

    // Pulse the connection lines
    if (linesRef.current) {
      linesRef.current.material.opacity = 0.08 + 0.05 * Math.sin(time * 1.5);
    }
  });

  return (
    <group>
      {/* Layer 1: Synaptic connection lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={data.lineVerts.length / 3}
            array={data.lineVerts}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Layer 2: Neural node glowing points */}
      <Points ref={nodesRef} positions={data.nodeBuf} colors={data.nodeColors} stride={3}>
        <PointMaterial
          transparent
          vertexColors
          size={0.22}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.85}
        />
      </Points>

      {/* Layer 3: Data stream particles flowing along connections */}
      <Points ref={streamRef} positions={data.streamBuf} colors={data.streamColors} stride={3}>
        <PointMaterial
          transparent
          vertexColors
          size={0.1}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.65}
        />
      </Points>
    </group>
  );
}

export default function NeuralBackground() {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      pointerEvents: 'none',
      background: 'radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(96,239,255,0.04) 0%, transparent 55%)',
    }}>
      <Canvas camera={{ position: [0, 0, 18], fov: 55 }}>
        <ambientLight intensity={0.3} />
        <NeuralNetwork />
      </Canvas>
    </div>
  );
}
