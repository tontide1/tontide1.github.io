import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ENTITY_MAP,
  ENTITY_CURRENT_POSITIONS,
  $hoveredEntityId,
  $selectedEntityId,
} from '../../stores/universe';

/** How fast the highlight light fades in and out (per second). */
const FADE_PER_SECOND = 6;
const HOVER_INTENSITY = 1.6;
const SELECTED_INTENSITY = 3.0;

/**
 * One light serves every hover/selection highlight.
 *
 * Mounting a light per highlight changes the scene's light count, and three
 * rebuilds the shader program of every lit material when that count changes —
 * a hover cost of hundreds of milliseconds spent in getShaderInfoLog. This
 * light is always in the scene; only its position, colour and intensity move,
 * so no program is ever recompiled. It also reads the stores imperatively, so
 * moving it does not re-render a single React component.
 */
export const HoverLight: React.FC = () => {
  const lightRef = useRef<THREE.PointLight>(null);
  const intensity = useRef(0);
  /** Last colour written, so the hex string is parsed once per highlight. */
  const shownColor = useRef<string | null>(null);

  useFrame((_, delta) => {
    const light = lightRef.current;
    if (!light) return;

    const hoveredId = $hoveredEntityId.get();
    const selectedId = $selectedEntityId.get();
    const entity = hoveredId ? ENTITY_MAP[hoveredId] : selectedId ? ENTITY_MAP[selectedId] : null;
    const target = entity ? (hoveredId ? HOVER_INTENSITY : SELECTED_INTENSITY) : 0;

    // The light must stay in the scene even at zero, or the count changes again.
    intensity.current += (target - intensity.current) * Math.min(delta * FADE_PER_SECOND, 1);
    light.intensity = intensity.current;
    if (!entity) return;

    const position = ENTITY_CURRENT_POSITIONS[entity.id];
    if (position) light.position.set(position[0], position[1], position[2]);
    if (shownColor.current !== entity.color) {
      shownColor.current = entity.color;
      light.color.set(entity.color);
    }
  });

  return <pointLight ref={lightRef} intensity={0} distance={5} />;
};
