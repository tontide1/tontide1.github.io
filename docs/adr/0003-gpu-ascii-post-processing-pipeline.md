# GPU Fragment Shader ASCII Post-Processing Pipeline

## Context

The visual identity of **TÀI — A Personal Gravity System** requires an ASCII/dithered appearance for celestial bodies and the gravity universe. 

There are multiple technical approaches to render a 3D scene as ASCII text:
1. **DOM Text Nodes:** Rendering thousands of `<span>` or `<pre>` elements updated each frame.
2. **CPU Canvas 2D:** Reading pixel data from the WebGL framebuffer to CPU memory via `readPixels()` and drawing text characters with `CanvasRenderingContext2D`.
3. **GPU Fragment Shader Post-Processing:** Rendering the 3D scene to an off-screen `WebGLRenderTarget`, then executing a custom fragment shader that samples luminance and maps pixel blocks to a glyph texture atlas in a single full-screen pass.

## Decision

Adopt **GPU Fragment Shader Post-Processing with a Monospace Character Texture Atlas**:
- Render the 3D scene graph to a lower-resolution render target.
- A custom GLSL post-processing pass samples pixel block luminance and maps it to character UVs from a pre-generated or procedurally generated ASCII texture atlas (`@`, `#`, `%`, `*`, `+`, `-`, `.`).
- All calculations remain 100% on the GPU.

## Consequences

- **Performance:** Guarantees solid 60fps rendering without CPU-GPU bus bottlenecks from `readPixels()`, nor DOM overhead.
- **Customizability:** Allows shader-driven analog dithering, luminance thresholding, and screen-resolution adaptation without code rewrites.
- **Independence:** Decouples the 3D scene logic from the visual styling layer.
