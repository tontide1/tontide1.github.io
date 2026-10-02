import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface OrbitRingProps {
  radius: number;
  color?: string;
  opacity?: number;
}

/**
 * The ring is one `THREE.LineLoop` for the lifetime of the radius. Highlighting
 * used to rebuild the object on every hover, which leaked the old material and
 * forced the scene graph to swap nodes while the pointer was moving, so colour
 * and opacity are now written onto the existing material instead.
 */
const OrbitRingBody: React.FC<OrbitRingProps> = ({
  radius,
  color = '#3a3a3a',
  opacity = 0.25,
}) => {
  const ring = useMemo(() => {
    const segments = 96;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }

    const material = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);
    return line;
  }, [radius]);

  useEffect(() => {
    const material = ring.material as THREE.LineBasicMaterial;
    material.color.set(color);
    material.opacity = opacity;
  }, [ring, color, opacity]);

  useEffect(() => {
    return () => {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    };
  }, [ring]);

  if (radius <= 0) return null;

  return <primitive object={ring} />;
};

export const OrbitRing = React.memo(OrbitRingBody);
