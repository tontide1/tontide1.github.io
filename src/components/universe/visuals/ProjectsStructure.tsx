import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { $prefersReducedMotion } from '../../../stores/environment';

interface ProjectsStructureProps {
  isHovered: boolean;
  isSelected: boolean;
}

export const ProjectsStructure: React.FC<ProjectsStructureProps> = ({
  isHovered,
  isSelected,
}) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const gimbalRef = useRef<THREE.Mesh>(null);
  const satGroup1Ref = useRef<THREE.Group>(null);
  const satGroup2Ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if ($prefersReducedMotion.get()) return;

    // Structured rotation
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.35;
      coreRef.current.rotation.x += delta * 0.15;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.2;
      wireRef.current.rotation.z += delta * 0.1;
    }
    if (gimbalRef.current) {
      gimbalRef.current.rotation.z += delta * 0.25;
    }
    if (satGroup1Ref.current) {
      satGroup1Ref.current.rotation.y += delta * 0.9;
    }
    if (satGroup2Ref.current) {
      satGroup2Ref.current.rotation.x += delta * 0.7;
      satGroup2Ref.current.rotation.z += delta * 0.5;
    }
  });

  const emissiveIntensity = isSelected ? 0.9 : isHovered ? 0.6 : 0.25;

  return (
    <group>
      {/* Solid Structured Core */}
      <mesh ref={coreRef}>
        <octahedronGeometry args={[0.65, 0]} />
        <meshStandardMaterial
          color="#1e3a8a"
          emissive="#2563eb"
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Exoskeleton Wireframe */}
      <mesh ref={wireRef}>
        <octahedronGeometry args={[0.72, 0]} />
        <meshBasicMaterial
          color="#6ea8fe"
          wireframe
          transparent
          opacity={isHovered ? 0.6 : 0.35}
        />
      </mesh>

      {/* Equatorial Construction Gimbal */}
      <mesh ref={gimbalRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.05, 0.015, 6, 48]} />
        <meshBasicMaterial
          color="#6ea8fe"
          transparent
          opacity={isHovered ? 0.5 : 0.25}
        />
      </mesh>

      {/* Satellite 1: Systems Module */}
      <group ref={satGroup1Ref}>
        <group position={[1.4, 0, 0]}>
          {/* Main module */}
          <mesh>
            <boxGeometry args={[0.18, 0.18, 0.18]} />
            <meshStandardMaterial
              color="#6ea8fe"
              emissive="#3b82f6"
              emissiveIntensity={0.5}
            />
          </mesh>
          {/* Solar wings */}
          <mesh>
            <boxGeometry args={[0.42, 0.015, 0.12]} />
            <meshBasicMaterial color="#93c5fd" />
          </mesh>
        </group>
      </group>

      {/* Satellite 2: Polar Probe */}
      <group ref={satGroup2Ref} rotation={[Math.PI / 3, 0, Math.PI / 4]}>
        <mesh position={[0, 1.55, 0]}>
          <octahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial
            color="#bfdbfe"
            emissive="#60a5fa"
            emissiveIntensity={0.6}
            wireframe
          />
        </mesh>
      </group>
    </group>
  );
};
