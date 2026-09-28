import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const UniverseControls: React.FC = () => {
  const { camera, gl } = useThree();

  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0.5, y: 0.3 }); // Initial nice angle
  const currentRotation = useRef({ x: 0.5, y: 0.3 });
  
  const targetDistance = useRef(18);
  const currentDistance = useRef(18);

  const mouseParallax = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const dom = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // Only left click
      isDragging.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      // Parallax update
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseParallax.current = { x: nx * 0.4, y: ny * 0.2 };

      if (!isDragging.current) return;

      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      targetRotation.current.y += deltaX * 0.005;
      targetRotation.current.x += deltaY * 0.005;

      // Clamp vertical rotation so we don't flip upside down
      targetRotation.current.x = Math.max(0.1, Math.min(Math.PI / 2.2, targetRotation.current.x));

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetDistance.current += e.deltaY * 0.015;
      // Clamp distance between 8 and 32
      targetDistance.current = Math.max(8, Math.min(32, targetDistance.current));
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  useFrame((_, delta) => {
    // Smooth damping (lerp)
    const factor = Math.min(delta * 6, 1);

    currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * factor;
    currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * factor;
    currentDistance.current += (targetDistance.current - currentDistance.current) * factor;

    // Calculate spherical coordinates with subtle parallax
    const phi = currentRotation.current.x + mouseParallax.current.y * 0.05;
    const theta = currentRotation.current.y + mouseParallax.current.x * 0.05;
    const dist = currentDistance.current;

    const x = dist * Math.sin(phi) * Math.sin(theta);
    const y = dist * Math.cos(phi);
    const z = dist * Math.sin(phi) * Math.cos(theta);

    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  });

  return null;
};
