import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { $prefersReducedMotion } from '../../../stores/environment';

interface ThoughtsConstellationProps {
  isHovered: boolean;
  isSelected: boolean;
}

export const ThoughtsConstellation: React.FC<ThoughtsConstellationProps> = ({
  isHovered,
  isSelected,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Deterministic constellation star nodes
  const nodes = useMemo(
    () => [
      new THREE.Vector3(0, 0, 0),             // Core thought node
      new THREE.Vector3(0.75, 0.45, -0.35),   // Idea node A
      new THREE.Vector3(-0.65, 0.55, 0.4),    // Idea node B
      new THREE.Vector3(-0.45, -0.6, -0.45),  // Idea node C
      new THREE.Vector3(0.55, -0.5, 0.5),     // Idea node D
      new THREE.Vector3(0.1, 0.8, 0.15),      // Top zenith node E
    ],
    []
  );

  // Line connections between constellation stars
  const linesGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [
      // Core links
      nodes[0], nodes[1],
      nodes[0], nodes[2],
      nodes[0], nodes[3],
      nodes[0], nodes[4],
      nodes[0], nodes[5],
      // Peripheral constellation edges
      nodes[1], nodes[5],
      nodes[2], nodes[5],
      nodes[1], nodes[4],
      nodes[2], nodes[3],
      nodes[3], nodes[4],
    ];

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return geom;
  }, [nodes]);

  useFrame((_, delta) => {
    if ($prefersReducedMotion.get()) return;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.22;
      groupRef.current.rotation.x += delta * 0.12;
      groupRef.current.rotation.z += delta * 0.08;
    }
  });

  const emissiveIntensity = isSelected ? 1.25 : isHovered ? 1.0 : 0.6;

  return (
    <group ref={groupRef}>
      {/* Constellation line segments */}
      <lineSegments geometry={linesGeometry}>
        <lineBasicMaterial
          color="#c084fc"
          transparent
          opacity={isHovered ? 0.65 : 0.35}
          linewidth={1}
        />
      </lineSegments>

      {/* Central Star Node */}
      <mesh position={nodes[0].toArray()}>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial
          color="#e9d5ff"
          emissive="#a855f7"
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
        />
      </mesh>

      {/* Satellite Star Nodes */}
      {nodes.slice(1).map((nodePos, i) => (
        <mesh key={`constellation-node-${i}`} position={nodePos.toArray()}>
          <tetrahedronGeometry args={[0.12 + (i % 3) * 0.03, 0]} />
          <meshStandardMaterial
            color="#e9d5ff"
            emissive="#c084fc"
            emissiveIntensity={emissiveIntensity * 0.8}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
};
