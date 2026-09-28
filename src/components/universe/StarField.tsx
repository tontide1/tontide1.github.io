import React, { useMemo } from 'react';
import * as THREE from 'three';

export const StarField: React.FC<{ count?: number }> = ({ count = 350 }) => {
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const baseColor = new THREE.Color('#777777');
    const dimColor = new THREE.Color('#3a3a3a');
    const brightColor = new THREE.Color('#e8e8e8');

    for (let i = 0; i < count; i++) {
      // Distribute in a spherical / disc volume
      const radius = 15 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;

      pos[i * 3] = radius * Math.cos(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * 0.4; // flatter plane
      pos[i * 3 + 2] = radius * Math.cos(phi) * Math.sin(theta);

      const r = Math.random();
      const chosenColor = r > 0.8 ? brightColor : r > 0.3 ? baseColor : dimColor;
      col[i * 3] = chosenColor.r;
      col[i * 3 + 1] = chosenColor.g;
      col[i * 3 + 2] = chosenColor.b;
    }

    return [pos, col];
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
};
