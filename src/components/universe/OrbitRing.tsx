import React, { useMemo } from 'react';
import * as THREE from 'three';

interface OrbitRingProps {
  radius: number;
  color?: string;
  opacity?: number;
}

export const OrbitRing: React.FC<OrbitRingProps> = ({
  radius,
  color = '#3a3a3a',
  opacity = 0.25,
}) => {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 96;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    return pts;
  }, [radius]);

  const lineGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return geom;
  }, [points]);

  if (radius <= 0) return null;

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </line>
  );
};
