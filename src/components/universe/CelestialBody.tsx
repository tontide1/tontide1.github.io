import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { hoverEntity, selectEntity, type EntityInfo } from '../../stores/universe';

interface CelestialBodyProps {
  entity: EntityInfo;
  isHovered: boolean;
  isSelected: boolean;
}

export const CelestialBody: React.FC<CelestialBodyProps> = ({
  entity,
  isHovered,
  isSelected,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const secondaryRef = useRef<THREE.Group>(null);

  // Initial angle for deterministic placement
  const angleRef = useRef(entity.orbitAngle);

  // Distinct visual grammar for each domain
  const geometry = useMemo(() => {
    switch (entity.id) {
      case 'tai':
        return new THREE.IcosahedronGeometry(1.2, 2);
      case 'projects':
        // Structured solid geometry (Octahedron / Box-like)
        return new THREE.OctahedronGeometry(0.75, 1);
      case 'research':
        // Binary / analytical pair
        return new THREE.DodecahedronGeometry(0.55, 1);
      case 'life':
        // Organic sphere
        return new THREE.SphereGeometry(0.65, 24, 24);
      case 'thoughts':
        // Constellation node
        return new THREE.TetrahedronGeometry(0.5, 0);
      case 'notes':
        // Asteroid fragment
        return new THREE.DodecahedronGeometry(0.4, 0);
      default:
        return new THREE.SphereGeometry(0.5, 16, 16);
    }
  }, [entity.id]);

  useFrame((_, delta) => {
    // Orbital rotation around center
    if (entity.orbitRadius > 0 && groupRef.current) {
      angleRef.current += entity.orbitSpeed * delta * 0.4;
      const x = Math.cos(angleRef.current) * entity.orbitRadius;
      const z = Math.sin(angleRef.current) * entity.orbitRadius;
      groupRef.current.position.set(x, 0, z);
    }

    // Self rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (entity.id === 'tai' ? 0.3 : 0.6);
      meshRef.current.rotation.x += delta * 0.2;
    }

    // Secondary satellites or binary nodes
    if (secondaryRef.current) {
      secondaryRef.current.rotation.y += delta * 1.2;
    }
  });

  const baseColor = useMemo(() => new THREE.Color(entity.color), [entity.color]);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Hitbox / Main mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          hoverEntity(entity.id);
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
          hoverEntity(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          selectEntity(entity.id);
        }}
      >
        <meshStandardMaterial
          color={baseColor}
          wireframe={entity.id === 'tai' || entity.id === 'projects'}
          emissive={baseColor}
          emissiveIntensity={isSelected ? 0.9 : isHovered ? 0.6 : 0.2}
          roughness={0.4}
        />
      </mesh>

      {/* Domain-specific secondary features */}
      {entity.id === 'tai' && (
        <mesh scale={[1.5, 1.5, 1.5]}>
          <icosahedronGeometry args={[1.2, 1]} />
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            transparent
            opacity={0.15}
          />
        </mesh>
      )}

      {entity.id === 'projects' && (
        <group ref={secondaryRef}>
          {/* Satellite cube orbiting the projects body */}
          <mesh position={[1.4, 0.2, 0]}>
            <boxGeometry args={[0.25, 0.25, 0.25]} />
            <meshStandardMaterial
              color="#6ea8fe"
              emissive="#6ea8fe"
              emissiveIntensity={0.5}
              wireframe
            />
          </mesh>
        </group>
      )}

      {entity.id === 'research' && (
        <group ref={secondaryRef}>
          {/* Binary companion node */}
          <mesh position={[0.9, 0.4, 0]}>
            <dodecahedronGeometry args={[0.35, 0]} />
            <meshStandardMaterial
              color="#93c5fd"
              emissive="#93c5fd"
              emissiveIntensity={0.4}
            />
          </mesh>
        </group>
      )}

      {entity.id === 'life' && (
        // Subtle atmosphere halo
        <mesh scale={[1.35, 1.35, 1.35]}>
          <ringGeometry args={[0.7, 0.95, 32]} />
          <meshBasicMaterial
            color="#a7f3d0"
            side={THREE.DoubleSide}
            transparent
            opacity={isHovered ? 0.5 : 0.25}
          />
        </mesh>
      )}

      {entity.id === 'notes' && (
        <group ref={secondaryRef}>
          {/* Small asteroid cloud fragments */}
          <mesh position={[0.7, 0.2, 0.3]}>
            <dodecahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial color="#fde68a" />
          </mesh>
          <mesh position={[-0.6, -0.2, 0.5]}>
            <dodecahedronGeometry args={[0.1, 0]} />
            <meshStandardMaterial color="#fde68a" />
          </mesh>
        </group>
      )}

      {/* Subtle label sprite or glow anchor */}
      {(isHovered || isSelected) && (
        <pointLight
          color={baseColor}
          intensity={isSelected ? 3.0 : 1.5}
          distance={4}
        />
      )}
    </group>
  );
};
