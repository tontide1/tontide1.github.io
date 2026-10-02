import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { $prefersReducedMotion } from '../../../stores/environment';

interface LifeBodyProps {
  isHovered: boolean;
  isSelected: boolean;
}

export const LifeBody: React.FC<LifeBodyProps> = ({ isHovered, isSelected }) => {
  const planetRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if ($prefersReducedMotion.get()) return;

    // Slower, serene organic rotation
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.16;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.12;
      atmosphereRef.current.rotation.z += delta * 0.05;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.08;
    }
  });

  const emissiveIntensity = isSelected ? 1.15 : isHovered ? 0.85 : 0.45;

  return (
    <group>
      {/* Organic planetary core */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[0.65, 32, 32]} />
        <meshStandardMaterial
          color="#a7f3d0"
          emissive="#059669"
          emissiveIntensity={emissiveIntensity}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Atmospheric halo shell */}
      <mesh ref={atmosphereRef} scale={[1.15, 1.15, 1.15]}>
        <sphereGeometry args={[0.65, 24, 24]} />
        <meshBasicMaterial
          color="#6ee7b7"
          transparent
          opacity={isHovered ? 0.28 : 0.14}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Tilted planetary ring (23.5° axial tilt) */}
      <mesh
        ref={ringRef}
        rotation={[Math.PI * 0.28, 0.1, 0.15]}
      >
        <ringGeometry args={[0.9, 1.35, 64]} />
        <meshBasicMaterial
          color="#a7f3d0"
          side={THREE.DoubleSide}
          transparent
          opacity={isHovered ? 0.45 : 0.22}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
