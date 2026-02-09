/* VideoBackground.jsx */
import { useEffect, useState, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useVideoTexture, useAspect } from '@react-three/drei';
import * as THREE from 'three';

const videos = [
    '/videos/vecteezy_cartoon-character-looking-around-on-alpha_57412431.mp4',
    '/videos/vecteezy_cute-boy-looking-around-on-alpha-channel_36251538.mp4'
];

function Scene({ url }) {
    const texture = useVideoTexture(url);
    const { size } = useThree();
    const scale = useAspect(size.width, size.height, 1); // Adjust aspect ratio safely
    const meshRef = useRef();

    // Subtle parallax effect
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = THREE.MathUtils.lerp(
                meshRef.current.rotation.y,
                (state.mouse.x * Math.PI) / 40,
                0.05
            );
            meshRef.current.rotation.x = THREE.MathUtils.lerp(
                meshRef.current.rotation.x,
                (-state.mouse.y * Math.PI) / 40,
                0.05
            );
        }
    });

    return (
        <mesh ref={meshRef} scale={[scale[0] * 1.2, scale[1] * 1.2, 1]}>
            <planeGeometry args={[1, 1, 32, 32]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
    );
}

export default function VideoBackground() {
    const [videoSrc, setVideoSrc] = useState('');

    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * videos.length);
        console.log("Selected video index:", randomIndex);
        setVideoSrc(videos[randomIndex]);
    }, []);

    if (!videoSrc) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -2,
            background: 'black' // Fallback
        }}>
            <Canvas camera={{ position: [0, 0, 1.5], fov: 75 }}>
                <Suspense fallback={null}>
                    <Scene url={videoSrc} />
                </Suspense>
            </Canvas>
        </div>
    );
}
