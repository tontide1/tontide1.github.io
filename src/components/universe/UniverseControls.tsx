import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '@nanostores/react';
import * as THREE from 'three';
import { $transitionState, ENTITY_MAP, ENTITY_CURRENT_POSITIONS } from '../../stores/universe';

export const UniverseControls: React.FC = () => {
  const { camera, gl } = useThree();
  const transition = useStore($transitionState);

  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0.5, y: 0.3 });
  const currentRotation = useRef({ x: 0.5, y: 0.3 });

  const targetDistance = useRef(18);
  const currentDistance = useRef(18);

  const mouseParallax = useRef({ x: 0, y: 0 });
  const hasNavigated = useRef(false);

  // Reset state on mount and handle bfcache restorations
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      $transitionState.set(null);
      hasNavigated.current = false;
    };

    window.addEventListener('pageshow', onPageShow);
    $transitionState.set(null);
    hasNavigated.current = false;

    return () => {
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  // Manage transition lifecycle and guarantee navigation with safety timer
  useEffect(() => {
    if (!transition) return;

    hasNavigated.current = false;

    // Safety timeout ensuring navigation always completes even if useFrame is throttled
    const timer = setTimeout(() => {
      if (!hasNavigated.current && transition) {
        hasNavigated.current = true;
        const targetPath = transition.targetPath;
        $transitionState.set(null);
        window.location.href = targetPath;
      }
    }, transition.duration + 200);

    return () => clearTimeout(timer);
  }, [transition]);

  useEffect(() => {
    const dom = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || transition) return;
      isDragging.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (transition) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseParallax.current = { x: nx * 0.4, y: ny * 0.2 };

      if (!isDragging.current) return;

      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      targetRotation.current.y += deltaX * 0.005;
      targetRotation.current.x += deltaY * 0.005;
      targetRotation.current.x = Math.max(0.1, Math.min(Math.PI / 2.2, targetRotation.current.x));

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (transition) return;
      e.preventDefault();
      targetDistance.current += e.deltaY * 0.015;
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
  }, [gl, transition]);

  useFrame((_, delta) => {
    // Cinematic camera fly-in transition
    if (transition) {
      const elapsed = Date.now() - transition.startTime;
      const progress = Math.min(elapsed / transition.duration, 1);

      const targetEntity = ENTITY_MAP[transition.targetId];
      let targetX = 0;
      let targetZ = 0;

      const dynamicPos = ENTITY_CURRENT_POSITIONS[transition.targetId];
      if (dynamicPos) {
        targetX = dynamicPos[0];
        targetZ = dynamicPos[2];
      } else if (targetEntity && targetEntity.orbitRadius > 0) {
        // Fallback to initial angle
        targetX = Math.cos(targetEntity.orbitAngle) * targetEntity.orbitRadius;
        targetZ = Math.sin(targetEntity.orbitAngle) * targetEntity.orbitRadius;
      }

      const dest = new THREE.Vector3(targetX, 0.5, targetZ);
      
      // Accelerate camera towards destination
      camera.position.lerp(dest, Math.min(delta * 7, 1));
      camera.lookAt(dest);

      if (progress >= 1 && !hasNavigated.current) {
        hasNavigated.current = true;
        const targetPath = transition.targetPath;
        $transitionState.set(null);
        window.location.href = targetPath;
      }
      return;
    }

    // Normal damping orbit controls
    const factor = Math.min(delta * 6, 1);
    currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * factor;
    currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * factor;
    currentDistance.current += (targetDistance.current - currentDistance.current) * factor;

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
