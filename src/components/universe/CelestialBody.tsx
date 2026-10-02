import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  hoverEntity,
  triggerTransition,
  updateEntityPosition,
  $draggingEntityId,
  $transitionState,
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

/**
 * Return-to-orbit spring. Damping ratio is about 0.64, so the body eases back
 * with a hint of overshoot rather than snapping.
 */
const SPRING_STIFFNESS = 55;
const SPRING_DAMPING = 9.5;
/** Largest pull (world units) a body may take from its orbit. */
const MAX_DOMAIN_OFFSET = 3;
const MAX_CORE_OFFSET = 1.6;
/** Fallback perspective when the active camera is orthographic. */
const FALLBACK_FOV = 50;

/** R3F hands over a synthetic event; only these three fields are needed. */
type PointerSample = Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>;

const CelestialBodyBody: React.FC<CelestialBodyProps> = ({
  entity,
  isHovered,
  isSelected,
}) => {
  const { camera, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const angleRef = useRef(entity.orbitAngle);
  const pointerDownAt = useRef<{ x: number; y: number } | null>(null);

  /** Orbit position without the drag pull, and the pull itself. */
  const basePosition = useRef(new THREE.Vector3());
  const drag = useRef({
    active: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    offset: new THREE.Vector3(),
    target: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    /** Detaches the listeners of the gesture in progress, if any. */
    finish: null as null | (() => void),
  });

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
    const body = drag.current;
    const group = groupRef.current;
    if (!group) return;

    const base = basePosition.current;

    if (entity.orbitRadius > 0) {
      // Reduced motion keeps the body on its current orbit position.
      if (!$prefersReducedMotion.get()) {
        angleRef.current += entity.orbitSpeed * delta * 0.4;
      }
      base.set(Math.cos(angleRef.current) * entity.orbitRadius, 0, Math.sin(angleRef.current) * entity.orbitRadius);
    } else {
      base.set(0, 0, 0);
    }

    if (body.active) {
      // Track the pointer exactly; the spring only runs on release.
      body.offset.copy(body.target);
      body.velocity.set(0, 0, 0);
    } else if (!$prefersReducedMotion.get()) {
      // Clamp the step so a dropped frame cannot destabilise the spring.
      const step = Math.min(delta, 0.05);
      body.velocity.addScaledVector(body.offset, -SPRING_STIFFNESS * step);
      body.velocity.addScaledVector(body.velocity, -SPRING_DAMPING * step);
      body.offset.addScaledVector(body.velocity, step);
    } else {
      // Gravity is instant when the user has asked for no motion.
      body.offset.set(0, 0, 0);
      body.velocity.set(0, 0, 0);
    }

    group.position.set(base.x + body.offset.x, base.y + body.offset.y, base.z + body.offset.z);
    updateEntityPosition(entity.id, group.position.x, group.position.y, group.position.z);
  });

  /**
   * Convert pointer travel into a pull along the camera's own axes, flattened
   * onto the orbital plane, so the body tracks the cursor's screen direction
   * instead of a fixed world axis. The scale is derived from the perspective
   * frustum at the body's depth, which makes the pull move 1:1 with the cursor.
   */
  const pull = (dxPx: number, dyPx: number) => {
    const body = drag.current;
    const distance = camera.position.distanceTo(basePosition.current);

    const fov = 'fov' in camera && typeof camera.fov === 'number' ? camera.fov : FALLBACK_FOV;
    const worldPerPixel = (2 * distance * Math.tan((fov * Math.PI) / 360)) / Math.max(size.height, 1);

    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const back = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2);
    right.y = 0;
    back.y = 0;
    // Near a top-down camera these collapse; fall back to world axes.
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    if (back.lengthSq() < 1e-6) back.set(0, 0, 1);

    body.target.addScaledVector(right.normalize(), dxPx * worldPerPixel);
    body.target.addScaledVector(back.normalize(), dyPx * worldPerPixel);

    const limit = entity.orbitRadius > 0 ? MAX_DOMAIN_OFFSET : MAX_CORE_OFFSET;
    if (body.target.lengthSq() > limit * limit) body.target.setLength(limit);
    body.velocity.set(0, 0, 0);
  };

  /**
   * Begin a pull. The move/up handlers are created here so that the exact
   * function references passed to addEventListener are the ones removed later;
   * component-level handlers would be recreated on every render and leak.
   */
  const startPull = (e: PointerSample) => {
    const body = drag.current;
    // A camera fly-through is navigating away; a pull must not fight it.
    if ($transitionState.get()) return;
    if (body.finish) return;

    body.active = true;
    body.pointerId = e.pointerId;
    body.lastX = e.clientX;
    body.lastY = e.clientY;
    // Start from wherever the body currently sits, so the grab feels attached.
    body.target.copy(body.offset);
    body.velocity.set(0, 0, 0);
    $draggingEntityId.set(entity.id);
    document.body.style.cursor = 'grabbing';

    const onMove = (ev: PointerEvent) => {
      if (!body.active || ev.pointerId !== body.pointerId) return;
      const dx = ev.clientX - body.lastX;
      const dy = ev.clientY - body.lastY;
      body.lastX = ev.clientX;
      body.lastY = ev.clientY;
      pull(dx, dy);
    };

    const finish = () => {
      if (body.active) {
        body.active = false;
        body.pointerId = -1;
        $draggingEntityId.set(null);
        document.body.style.cursor = 'default';
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      body.finish = null;
    };

    body.finish = finish;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  };

  // Never leave a pull armed if the canvas unmounts mid-gesture.
  useEffect(() => () => drag.current.finish?.(), []);

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
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          pointerDownAt.current = { x: e.clientX, y: e.clientY };
          startPull(e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          const from = pointerDownAt.current;
          pointerDownAt.current = null;
          // A touch that travelled is an orbit drag, not a tap to enter.
          if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > TAP_TRAVEL_PX) return;
          triggerTransition(entity.id, entity.path);
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
    </group>
  );
};

/**
 * Memoised because the hover state lives in the canvas and changes it re-render
 * the whole tree: without this every one of the six bodies, and every visual
 * inside them, re-renders when a single body is hovered.
 */
export const CelestialBody = React.memo(CelestialBodyBody);
