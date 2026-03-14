import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// A single drifting particle layer
function ParticleLayer({ count, spread, size, speed, palette, zDepth = 0 }) {
    const ref = useRef();

    const { positions, colors } = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * spread;
            positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 8 + zDepth;

            const c = palette[Math.floor(Math.random() * palette.length)];
            colors[i * 3]     = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }
        return { positions, colors };
    }, [count, spread, palette, zDepth]);

    // Independent drift offsets per particle
    const offsets = useMemo(() => {
        const arr = new Float32Array(count);
        for (let i = 0; i < count; i++) arr[i] = Math.random() * Math.PI * 2;
        return arr;
    }, [count]);

    const positionBuffer = useMemo(() => positions.slice(), [positions]);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (!ref.current) return;

        // Organic floating drift: each particle drifts independently
        const pos = ref.current.geometry.attributes.position;
        for (let i = 0; i < count; i++) {
            const ox = offsets[i];
            pos.array[i * 3]     = positionBuffer[i * 3]     + Math.sin(time * speed + ox)       * 0.8;
            pos.array[i * 3 + 1] = positionBuffer[i * 3 + 1] + Math.cos(time * speed * 0.7 + ox) * 0.6;
            pos.array[i * 3 + 2] = positionBuffer[i * 3 + 2] + Math.sin(time * speed * 0.4 + ox) * 0.3;
        }
        pos.needsUpdate = true;

        // Slow global drift
        ref.current.rotation.y = time * 0.025 * speed;
        ref.current.rotation.z = time * 0.01 * speed;

        // Pulsing opacity
        ref.current.material.opacity = 0.4 + 0.15 * Math.sin(time * 1.2 + offsets[0]);
    });

    return (
        <Points ref={ref} positions={positions} colors={colors} stride={3}>
            <PointMaterial
                transparent
                vertexColors
                size={size}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                opacity={0.45}
            />
        </Points>
    );
}

const PALETTE_COOL = [
    new THREE.Color('#5AA9FF'),
    new THREE.Color('#60efff'),
    new THREE.Color('#a78bfa'),
    new THREE.Color('#7C9DFF'),
];

const PALETTE_WARM = [
    new THREE.Color('#f472b6'),
    new THREE.Color('#c084fc'),
    new THREE.Color('#818cf8'),
    new THREE.Color('#38bdf8'),
];

const PALETTE_DEEP = [
    new THREE.Color('#312e81'),
    new THREE.Color('#1e40af'),
    new THREE.Color('#4c1d95'),
    new THREE.Color('#0e7490'),
];

export default function Background3D() {
    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            zIndex: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.05) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(167,139,250,0.05) 0%, transparent 55%)',
        }}>
            <Canvas camera={{ position: [0, 0, 16], fov: 60 }}>
                <ambientLight intensity={0.2} />

                {/* Deep background layer - large dim particles */}
                <ParticleLayer
                    count={300}
                    spread={60}
                    size={0.08}
                    speed={0.18}
                    palette={PALETTE_DEEP}
                    zDepth={-5}
                />

                {/* Mid layer - medium vibrant particles */}
                <ParticleLayer
                    count={500}
                    spread={40}
                    size={0.14}
                    speed={0.28}
                    palette={PALETTE_COOL}
                    zDepth={0}
                />

                {/* Foreground - small fast bright particles */}
                <ParticleLayer
                    count={200}
                    spread={28}
                    size={0.22}
                    speed={0.45}
                    palette={PALETTE_WARM}
                    zDepth={4}
                />
            </Canvas>
        </div>
    );
}
