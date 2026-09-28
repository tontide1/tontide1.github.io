import React from 'react';
import { Canvas } from '@react-three/fiber';
import { useStore } from '@nanostores/react';
import {
  ENTITY_MAP,
  $selectedEntityId,
  $hoveredEntityId,
} from '../../stores/universe';
import { CelestialBody } from './CelestialBody';
import { OrbitRing } from './OrbitRing';
import { StarField } from './StarField';
import { UniverseControls } from './UniverseControls';
import { AsciiEffect } from './AsciiEffect';

export const UniverseCanvas: React.FC = () => {
  const selectedId = useStore($selectedEntityId);
  const hoveredId = useStore($hoveredEntityId);

  const entities = Object.values(ENTITY_MAP);

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050505] overflow-hidden select-none">
      <Canvas
        camera={{ position: [0, 14, 18], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        className="w-full h-full"
      >
        <color attach="background" args={['#050505']} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[0, 0, 0]} intensity={2.5} color="#ffffff" distance={25} />
        <pointLight position={[10, 15, 10]} intensity={0.8} color="#6ea8fe" />

        {/* Star Background */}
        <StarField count={400} />

        {/* Orbital Rings */}
        {entities.map(
          (entity) =>
            entity.orbitRadius > 0 && (
              <OrbitRing
                key={`orbit-${entity.id}`}
                radius={entity.orbitRadius}
                color={hoveredId === entity.id || selectedId === entity.id ? entity.color : '#262626'}
                opacity={hoveredId === entity.id || selectedId === entity.id ? 0.6 : 0.25}
              />
            )
        )}

        {/* Celestial Entities */}
        {entities.map((entity) => (
          <CelestialBody
            key={`body-${entity.id}`}
            entity={entity}
            isHovered={hoveredId === entity.id}
            isSelected={selectedId === entity.id}
          />
        ))}

        {/* Orbit & Drag Camera Controls */}
        <UniverseControls />

        {/* GPU Fragment Shader ASCII Post-Processing (Slice 6) */}
        <AsciiEffect />
      </Canvas>
    </div>
  );
};
