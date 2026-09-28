import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  hoverEntity,
  selectEntity,
  updateEntityPosition,
  type EntityInfo,
} from '../../stores/universe';
import { $prefersReducedMotion } from '../../stores/environment';
import { TaiCore } from './visuals/TaiCore';
import { LifeBody } from './visuals/LifeBody';
import { ThoughtsConstellation } from './visuals/ThoughtsConstellation';
import { NotesAsteroids } from './visuals/NotesAsteroids';
import { ProjectsStructure } from './visuals/ProjectsStructure';
import { ResearchBinary } from './visuals/ResearchBinary';

interface CelestialBodyProps {
  entity: EntityInfo;
  isHovered: boolean;
  isSelected: boolean;
}

/** Pointer travel (px) above which a click is treated as an orbit drag. */
const TAP_TRAVEL_PX = 8;

export const CelestialBody: React.FC<CelestialBodyProps> = ({
  entity,
  isHovered,
  isSelected,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const angleRef = useRef(entity.orbitAngle);
  const pointerDownAt = useRef<{ x: number; y: number } | null>(null);

  // Initialize position in store
  useEffect(() => {
    if (entity.orbitRadius === 0) {
      updateEntityPosition(entity.id, 0, 0, 0);
    } else {
      const x = Math.cos(entity.orbitAngle) * entity.orbitRadius;
      const z = Math.sin(entity.orbitAngle) * entity.orbitRadius;
      updateEntityPosition(entity.id, x, 0, z);
    }
  }, [entity]);

  useFrame((_, delta) => {
    // Orbital revolution around central anchor
    if (entity.orbitRadius > 0 && groupRef.current) {
      // Reduced motion keeps the body on its current orbit position.
      if (!$prefersReducedMotion.get()) {
        angleRef.current += entity.orbitSpeed * delta * 0.4;
      }
      const x = Math.cos(angleRef.current) * entity.orbitRadius;
      const z = Math.sin(angleRef.current) * entity.orbitRadius;
      groupRef.current.position.set(x, 0, z);
      updateEntityPosition(entity.id, x, 0, z);
    }
  });

  const baseColor = useMemo(() => new THREE.Color(entity.color), [entity.color]);

  // Radius for the invisible click/hover hitbox
  const hitRadius = useMemo(() => {
    switch (entity.id) {
      case 'tai':
        return 2.0;
      case 'projects':
        return 1.6;
      case 'notes':
        return 1.5;
      case 'thoughts':
        return 1.5;
      case 'research':
        return 1.5;
      case 'life':
        return 1.5;
      default:
        return 1.3;
    }
  }, [entity.id]);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Invisible Interactive Hitbox for responsive hover and selection */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          hoverEntity(entity.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'default';
          hoverEntity(null);
        }}
        onPointerDown={(e) => {
          pointerDownAt.current = { x: e.clientX, y: e.clientY };
        }}
        onClick={(e) => {
          e.stopPropagation();
          const from = pointerDownAt.current;
          pointerDownAt.current = null;
          // A touch that travelled is an orbit drag, not a tap to enter.
          if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > TAP_TRAVEL_PX) return;
          selectEntity(entity.id);
        }}
      >
        <sphereGeometry args={[hitRadius, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Domain-specific visual grammar components */}
      {entity.id === 'tai' && (
        <TaiCore isHovered={isHovered} isSelected={isSelected} />
      )}
      {entity.id === 'life' && (
        <LifeBody isHovered={isHovered} isSelected={isSelected} />
      )}
      {entity.id === 'thoughts' && (
        <ThoughtsConstellation isHovered={isHovered} isSelected={isSelected} />
      )}
      {entity.id === 'notes' && (
        <NotesAsteroids isHovered={isHovered} isSelected={isSelected} />
      )}
      {entity.id === 'projects' && (
        <ProjectsStructure isHovered={isHovered} isSelected={isSelected} />
      )}
      {entity.id === 'research' && (
        <ResearchBinary isHovered={isHovered} isSelected={isSelected} />
      )}

      {/* Subtle dynamic illumination when hovered or selected */}
      {(isHovered || isSelected) && (
        <pointLight
          color={baseColor}
          intensity={isSelected ? 3.0 : 1.6}
          distance={5}
        />
      )}
    </group>
  );
};
