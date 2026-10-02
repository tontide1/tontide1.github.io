import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '@nanostores/react';
import * as THREE from 'three';
import { $transitionState, $draggingEntityId, ENTITY_MAP, ENTITY_CURRENT_POSITIONS } from '../../stores/universe';
import { $prefersReducedMotion, getQualityProfile } from '../../stores/environment';

const MIN_DISTANCE = 8;
const MAX_DISTANCE = 32;
const MIN_PHI = 0.1;
const MAX_PHI = Math.PI / 2.2;

export const UniverseControls: React.FC = () => {
  const { camera, gl } = useThree();
  const transition = useStore($transitionState);
  const reducedMotion = useStore($prefersReducedMotion);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);
  const isDragging = useRef(false);
  const previousPointerPosition = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0.5, y: 0.3 });
  const currentRotation = useRef({ x: 0.5, y: 0.3 });

  const initialDistance = getQualityProfile().tier === 'low' ? 24 : 18;
  const targetDistance = useRef(initialDistance);
  const currentDistance = useRef(initialDistance);

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

    // Reduced motion: complete the transition immediately, no camera fly-through.
    if (reducedMotion) {
      hasNavigated.current = true;
      $transitionState.set(null);
      window.location.href = transition.targetPath;
      return;
    }

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
  }, [transition, reducedMotion]);

  useEffect(() => {
    const dom = gl.domElement;

    const pinchSpan = () => {
      const [a, b] = Array.from(pointers.current.values());
      if (!a || !b) return null;
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const clampDistance = (value: number) => Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, value));

    const onPointerDown = (e: PointerEvent) => {
      if (transition) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 1) {
        isDragging.current = true;
        previousPointerPosition.current = { x: e.clientX, y: e.clientY };
      } else {
        // A second finger turns the gesture into a pinch, not an orbit drag.
        isDragging.current = false;
        pinchDistance.current = pinchSpan();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (transition) return;

      if (!pointers.current.has(e.pointerId)) return;

      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size >= 2) {
        const span = pinchSpan();
        if (span !== null && pinchDistance.current !== null) {
          // Spreading the fingers pulls the camera in, pinching pushes it out.
          targetDistance.current = clampDistance(
            targetDistance.current + (pinchDistance.current - span) * 0.02
          );
        }
        pinchDistance.current = span;
        return;
      }

      if (!isDragging.current) return;

      const deltaX = e.clientX - previousPointerPosition.current.x;
      const deltaY = e.clientY - previousPointerPosition.current.y;
      // Advance the origin every move so the next orbit drag cannot jump, even
      // if this one is handed over to a body drag.
      previousPointerPosition.current = { x: e.clientX, y: e.clientY };

      // A body drag owns the gesture: the camera holds still.
      if ($draggingEntityId.get()) return;

      targetRotation.current.y += deltaX * 0.005;
      targetRotation.current.x += deltaY * 0.005;
      targetRotation.current.x = Math.max(MIN_PHI, Math.min(MAX_PHI, targetRotation.current.x));
    };

    const onPointerUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) {
        pinchDistance.current = null;
      }
      if (pointers.current.size === 0) {
        isDragging.current = false;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (transition) return;
      e.preventDefault();
      targetDistance.current = clampDistance(targetDistance.current + e.deltaY * 0.015);
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
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

    const phi = currentRotation.current.x;
    const theta = currentRotation.current.y;
    const dist = currentDistance.current;

    const x = dist * Math.sin(phi) * Math.sin(theta);
    const y = dist * Math.cos(phi);
    const z = dist * Math.sin(phi) * Math.cos(theta);

    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  });

  return null;
};
