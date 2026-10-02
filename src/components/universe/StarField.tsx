import React, { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Seed for the starfield. spec.md §18 lists deterministic layout as a must-have:
 * the universe is meant to be a stable place, not a reshuffle on every reload.
 * Changing this re-scatters the whole field, so keep it fixed once chosen.
 */
const STARFIELD_SEED = 0x746169;

/** mulberry32: small, fast, and reproducible for a given seed. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Soft round sprite for every star, built once.
 *
 * A `points` material without a map draws a hard square, and at this density the
 * near stars are several pixels across, so the squares were plainly visible. The
 * corners are black and the material adds, so no alpha test is needed.
 */
let starSprite: THREE.CanvasTexture | null = null;
function getStarSprite(): THREE.CanvasTexture {
  if (starSprite) return starSprite;

  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  starSprite = new THREE.CanvasTexture(canvas);
  starSprite.needsUpdate = true;
  return starSprite;
}

export const StarField: React.FC<{ count?: number }> = ({ count = 350 }) => {
  // Stars keep a fixed size in device pixels rather than shrinking with distance.
  // With attenuation on, the same field read as a handful of big blobs near the
  // camera and nothing at all in the distance, which left the sky mostly black.
  const dpr = useThree((state) => state.viewport.dpr);

  const [positions, colors] = useMemo(() => {
    const random = seededRandom(STARFIELD_SEED);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const baseColor = new THREE.Color('#b6bfcc');
    const dimColor = new THREE.Color('#6a707a');
    const brightColor = new THREE.Color('#ffffff');

    for (let i = 0; i < count; i++) {
      // Uniform over a spherical shell, flattened a little into a disc so the
      // universe keeps a plane to orbit in.
      const radius = 18 + random() * 72;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.cos(phi) * 0.75;
      pos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const r = random();
      // Weighted towards the visible end: an even split left the field reading
      // as a mostly black sky with a few dots in it.
      const chosenColor = r > 0.65 ? brightColor : r > 0.15 ? baseColor : dimColor;
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
        map={getStarSprite()}
        size={2.6 * dpr}
        sizeAttenuation={false}
        vertexColors
        transparent
        opacity={0.95}
        alphaTest={0.3}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
