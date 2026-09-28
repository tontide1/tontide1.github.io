import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TaiCoreProps {
  isHovered: boolean;
  isSelected: boolean;
}

export const TaiCore: React.FC<TaiCoreProps> = ({ isHovered, isSelected }) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const innerShellRef = useRef<THREE.Mesh>(null);
  const outerShellRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    // Gentle breathing pulse
    const elapsed = state.clock.getElapsedTime();
    const pulse = 1 + Math.sin(elapsed * 1.2) * 0.03;

    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.25;
      coreRef.current.rotation.x += delta * 0.1;
      coreRef.current.scale.set(pulse, pulse, pulse);
    }

    if (innerShellRef.current) {
      innerShellRef.current.rotation.y -= delta * 0.35;
      innerShellRef.current.rotation.z += delta * 0.15;
    }

    if (outerShellRef.current) {
      outerShellRef.current.rotation.y += delta * 0.18;
      outerShellRef.current.rotation.x -= delta * 0.12;
    }
  });

  const emissiveIntensity = isSelected ? 0.9 : isHovered ? 0.6 : 0.3;

  return (
    <group>
      {/* Dense solid core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.0, 2]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Inner geometric lattice shell */}
      <mesh ref={innerShellRef} scale={[1.35, 1.35, 1.35]}>
        <icosahedronGeometry args={[1.0, 1]} />
        <meshBasicMaterial
          color="#e8e8e8"
          wireframe
          transparent
          opacity={isHovered ? 0.35 : 0.2}
        />
      </mesh>

      {/* Outer subtle orbital boundary shell */}
      <mesh ref={outerShellRef} scale={[1.75, 1.75, 1.75]}>
        <dodecahedronGeometry args={[1.0, 0]} />
        <meshBasicMaterial
          color="#a3a3a3"
          wireframe
          transparent
          opacity={isHovered ? 0.2 : 0.08}
        />
      </mesh>
    </group>
  );
};
