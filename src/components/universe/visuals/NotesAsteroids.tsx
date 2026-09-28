import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NotesAsteroidsProps {
  isHovered: boolean;
  isSelected: boolean;
}

interface AsteroidData {
  radius: number;
  speed: number;
  initialAngle: number;
  yOffset: number;
  scale: number;
  tilt: [number, number, number];
}

export const NotesAsteroids: React.FC<NotesAsteroidsProps> = ({
  isHovered,
  isSelected,
}) => {
  const nucleusRef = useRef<THREE.Mesh>(null);
  const swarmGroupRef = useRef<THREE.Group>(null);

  // Deterministic asteroid swarm parameters
  const asteroids: AsteroidData[] = useMemo(() => {
    const list: AsteroidData[] = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      // Deterministic pseudo-random distribution
      const frac = i / count;
      const angle = frac * Math.PI * 2 + (i % 3) * 0.4;
      const radius = 0.65 + ((i * 7) % 11) * 0.07; // between 0.65 and 1.35
      const yOffset = (((i * 13) % 9) - 4) * 0.06; // between -0.24 and +0.24
      const speed = 0.5 + ((i * 5) % 7) * 0.15;
      const scale = 0.06 + ((i * 3) % 5) * 0.02; // between 0.06 and 0.14
      list.push({
        radius,
        speed,
        initialAngle: angle,
        yOffset,
        scale,
        tilt: [(i % 4) * 0.3, (i % 5) * 0.2, (i % 3) * 0.25],
      });
    }
    return list;
  }, []);

  // Refs for each asteroid mesh
  const fragmentRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state, delta) => {
    if (nucleusRef.current) {
      nucleusRef.current.rotation.y += delta * 0.4;
      nucleusRef.current.rotation.x += delta * 0.2;
    }

    const elapsed = state.clock.getElapsedTime();

    asteroids.forEach((item, idx) => {
      const mesh = fragmentRefs.current[idx];
      if (mesh) {
        const curAngle = item.initialAngle + elapsed * item.speed * 0.8;
        const x = Math.cos(curAngle) * item.radius;
        const z = Math.sin(curAngle) * item.radius;
        mesh.position.set(x, item.yOffset, z);
        mesh.rotation.y += delta * item.speed * 1.5;
        mesh.rotation.x += delta * item.speed;
      }
    });
  });

  const emissiveIntensity = isSelected ? 0.9 : isHovered ? 0.6 : 0.25;

  return (
    <group>
      {/* Central Asteroid Nucleus */}
      <mesh ref={nucleusRef}>
        <dodecahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial
          color="#fde68a"
          emissive="#d97706"
          emissiveIntensity={emissiveIntensity}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Scattered Knowledge Asteroid Swarm */}
      <group ref={swarmGroupRef}>
        {asteroids.map((ast, i) => (
          <mesh
            key={`asteroid-frag-${i}`}
            ref={(el) => (fragmentRefs.current[i] = el)}
            scale={[ast.scale, ast.scale, ast.scale]}
            rotation={ast.tilt}
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color="#fde68a"
              emissive="#b45309"
              emissiveIntensity={isHovered ? 0.5 : 0.2}
              roughness={0.9}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};
