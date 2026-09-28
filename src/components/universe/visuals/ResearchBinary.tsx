import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { $prefersReducedMotion } from '../../../stores/environment';

interface ResearchBinaryProps {
  isHovered: boolean;
  isSelected: boolean;
}

export const ResearchBinary: React.FC<ResearchBinaryProps> = ({
  isHovered,
  isSelected,
}) => {
  const binaryGroupRef = useRef<THREE.Group>(null);
  const primaryMeshRef = useRef<THREE.Mesh>(null);
  const secondaryMeshRef = useRef<THREE.Mesh>(null);

  // Analytical tether line connecting the two binary nodes
  const tetherGeometry = useMemo(() => {
    const points = [
      new THREE.Vector3(-0.45, 0, 0),
      new THREE.Vector3(0.55, 0, 0),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame((_, delta) => {
    if ($prefersReducedMotion.get()) return;

    // Rotation around shared barycenter
    if (binaryGroupRef.current) {
      binaryGroupRef.current.rotation.y += delta * 0.45;
      binaryGroupRef.current.rotation.z += delta * 0.12;
    }
    // Individual spins
    if (primaryMeshRef.current) {
      primaryMeshRef.current.rotation.y += delta * 0.5;
    }
    if (secondaryMeshRef.current) {
      secondaryMeshRef.current.rotation.y -= delta * 0.6;
    }
  });

  const emissiveIntensity = isSelected ? 0.9 : isHovered ? 0.6 : 0.3;

  return (
    <group>
      {/* Mutual Barycentric Orbit Track */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.008, 6, 48]} />
        <meshBasicMaterial
          color="#93c5fd"
          transparent
          opacity={isHovered ? 0.4 : 0.18}
        />
      </mesh>

      {/* Binary Co-orbiting System */}
      <group ref={binaryGroupRef}>
        {/* Analytical Tether Line */}
        <lineSegments geometry={tetherGeometry}>
          <lineBasicMaterial
            color="#93c5fd"
            transparent
            opacity={isHovered ? 0.5 : 0.25}
          />
        </lineSegments>

        {/* Primary Body: Question / Evidence */}
        <mesh ref={primaryMeshRef} position={[-0.45, 0, 0]}>
          <dodecahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial
            color="#93c5fd"
            emissive="#2563eb"
            emissiveIntensity={emissiveIntensity}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>

        {/* Secondary Companion: Hypothesis / Experiment */}
        <mesh ref={secondaryMeshRef} position={[0.55, 0, 0]}>
          <dodecahedronGeometry args={[0.28, 0]} />
          <meshStandardMaterial
            color="#bfdbfe"
            emissive="#3b82f6"
            emissiveIntensity={emissiveIntensity * 0.85}
            roughness={0.5}
            metalness={0.5}
          />
        </mesh>
      </group>
    </group>
  );
};
