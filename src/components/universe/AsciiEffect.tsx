import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '@nanostores/react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { $isAsciiMode } from '../../stores/universe';
import { $deviceTier, $prefersReducedMotion, getQualityProfile } from '../../stores/environment';

// Generate procedural ASCII monospace character atlas texture
function createCharAtlasTexture(): THREE.CanvasTexture {
  const chars = [' ', '.', ':', '-', '+', '*', '%', '#', '@', '█'];
  const count = chars.length;
  const charWidth = 32;
  const charHeight = 48; // 1 : 1.5 aspect ratio

  const canvas = document.createElement('canvas');
  canvas.width = charWidth * count;
  canvas.height = charHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Crisp white glyphs
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  chars.forEach((ch, idx) => {
    const x = idx * charWidth + charWidth / 2;
    const y = charHeight / 2;
    ctx.fillText(ch, x, y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

const AsciiShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uCharAtlas: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2() },
    uCharSize: { value: 8.5 }, // Character width in pixels
    uCharCount: { value: 10.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D uCharAtlas;
    uniform vec2 uResolution;
    uniform float uCharSize;
    uniform float uCharCount;
    varying vec2 vUv;

    void main() {
      // Monospace cell dimensions (width : height = 1.0 : 1.5)
      vec2 cellSize = vec2(uCharSize, uCharSize * 1.5);
      vec2 cellCount = uResolution / cellSize;
      vec2 cellCoord = floor(vUv * cellCount);
      vec2 cellUv = fract(vUv * cellCount);

      // Sample scene color at the center of the character cell
      vec2 sampleUv = (cellCoord + 0.5) / cellCount;
      vec4 sceneColor = texture2D(tDiffuse, sampleUv);

      // Compute perceived luminance (Rec. 709)
      float lum = dot(sceneColor.rgb, vec3(0.2126, 0.7152, 0.0722));

      // Threshold for deep space void
      if (lum < 0.02) {
        gl_FragColor = vec4(0.02, 0.02, 0.02, 1.0);
        return;
      }

      // Map luminance to character index [0 .. uCharCount - 1]
      float charIdx = floor(clamp(lum, 0.0, 0.999) * uCharCount);

      // Sample from character atlas horizontal strip
      vec2 glyphUv = vec2((charIdx + cellUv.x) / uCharCount, cellUv.y);
      vec4 glyph = texture2D(uCharAtlas, glyphUv);

      // Multiply scene color tint by glyph brightness
      vec3 finalColor = sceneColor.rgb * 1.3 * glyph.r;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

export const AsciiEffect: React.FC = () => {
  const { gl, scene, camera, size, viewport } = useThree();
  const deviceTier = useStore($deviceTier);
  const reducedMotion = useStore($prefersReducedMotion);

  const quality = getQualityProfile(deviceTier, reducedMotion);

  // Generate character atlas once
  const charAtlasTexture = useMemo(() => createCharAtlasTexture(), []);

  // Post-processing composer and pass refs
  const composerRef = useRef<EffectComposer | null>(null);
  const shaderPassRef = useRef<ShaderPass | null>(null);

  useEffect(() => {
    // Composer sizes are CSS pixels: `EffectComposer` multiplies by the
    // renderer's pixel ratio itself, and `viewport.dpr` is already that ratio.
    // Passing device pixels here rendered the post-processing buffer at dpr².
    const renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    const composer = new EffectComposer(gl, renderTarget);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const asciiShader = {
      uniforms: THREE.UniformsUtils.clone(AsciiShader.uniforms),
      vertexShader: AsciiShader.vertexShader,
      fragmentShader: AsciiShader.fragmentShader,
    };
    asciiShader.uniforms.uCharAtlas.value = charAtlasTexture;
    // The shader compares cell size against the buffer in *device* pixels.
    asciiShader.uniforms.uResolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
    asciiShader.uniforms.uCharSize.value = getQualityProfile().asciiCharSize;

    const shaderPass = new ShaderPass(asciiShader);
    composer.addPass(shaderPass);

    composerRef.current = composer;
    shaderPassRef.current = shaderPass;

    return () => {
      composer.dispose();
      renderTarget.dispose();
    };
  }, [gl, scene, camera, charAtlasTexture]);

  // Update resolution on viewport resize and cell size on device tier change
  useEffect(() => {
    if (composerRef.current && shaderPassRef.current) {
      composerRef.current.setSize(size.width, size.height);
      shaderPassRef.current.uniforms.uResolution.value.set(
        size.width * viewport.dpr,
        size.height * viewport.dpr
      );
      shaderPassRef.current.uniforms.uCharSize.value = quality.asciiCharSize;
    }
  }, [size, viewport.dpr, quality.asciiCharSize]);

  /**
   * Render the frame, and take over from R3F's own render because a positive
   * `useFrame` priority suppresses it.
   *
   * The composer only earns its cost while ASCII mode is on. With it off — the
   * default — it still allocated a full-screen render target and copied the
   * scene through a second full-screen pass for nothing, so the scene is drawn
   * straight to the canvas instead. The store is read imperatively so toggling
   * ASCII does not re-render the canvas tree.
   */
  useFrame(() => {
    const composer = composerRef.current;
    if (composer && $isAsciiMode.get()) composer.render();
    else gl.render(scene, camera);
  }, 1);

  return null;
};
