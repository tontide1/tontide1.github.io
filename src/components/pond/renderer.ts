import {
  ART_TILES,
  MONKEY_ANCHOR_COL,
  MONKEY_ANCHOR_ROW,
  REF_COLS,
  REF_ROWS,
  type TileSpec,
} from './artData';
import {
  clamp,
  hash3,
  PEANUT_FADE,
  PEANUT_LIFE,
  smoothstep,
  type Box,
  type World,
} from './world';

type Rgb = [number, number, number];

// Visibility reduction under page prose
const DIM_UNDER_CONTENT = 0.15;

interface Palette {
  bg: Rgb;
  fur: Rgb;
  furLit: Rgb;
  furInk: Rgb;
  face: Rgb;
  faceInk: Rgb;
  eye: Rgb;
  catchlight: Rgb;
  ear: Rgb;
  edge: Rgb;
  edgeInk: Rgb;
  branch: Rgb;
  branchInk: Rgb;
  leaf: Rgb;
  water: Rgb;
  waterDeep: Rgb;
  waterLight: Rgb;
  peanut: Rgb;
  spark: Rgb;
  alpha: number;
}

const DARK: Palette = {
  bg: [18, 17, 16],
  fur: [63, 49, 41],
  furLit: [84, 72, 60],
  furInk: [160, 148, 134],
  face: [238, 230, 218],
  faceInk: [36, 32, 28],
  eye: [14, 12, 11],
  catchlight: [240, 235, 225],
  ear: [214, 104, 38],
  edge: [224, 112, 44],
  edgeInk: [48, 20, 10],
  branch: [130, 118, 106],
  branchInk: [110, 100, 90],
  leaf: [214, 104, 38],
  water: [72, 156, 222],
  waterDeep: [34, 92, 156],
  waterLight: [132, 208, 250],
  peanut: [238, 186, 92],
  spark: [236, 132, 60],
  alpha: 0.95,
};

const LIGHT: Palette = {
  bg: [245, 244, 241],
  fur: [88, 80, 70],
  furLit: [130, 118, 104],
  furInk: [228, 220, 208],
  face: [250, 246, 238],
  faceInk: [96, 86, 72],
  eye: [26, 22, 18],
  catchlight: [255, 253, 246],
  ear: [214, 100, 44],
  edge: [196, 82, 32],
  edgeInk: [58, 26, 10],
  branch: [120, 108, 96],
  branchInk: [52, 44, 36],
  leaf: [214, 100, 44],
  water: [52, 122, 186],
  waterDeep: [34, 88, 142],
  waterLight: [96, 162, 214],
  peanut: [178, 118, 44],
  spark: [196, 88, 36],
  alpha: 0.95,
};

const packRgb = (c: Rgb) => (c[0] << 16) | (c[1] << 8) | c[2];

export class PondRenderer {
  private cw = 9;
  private ch = 12;
  private cols = 0;
  private rows = 0;
  private palette = DARK;
  private isLight = false;
  private styles = new Map<number, string>();
  private fontFamily = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

  private cellGlyph = new Uint16Array(0);
  private cellColor = new Uint32Array(0);
  private cellAlpha = new Float32Array(0);
  private cellTile = new Uint32Array(0);
  private cellTileAlpha = new Float32Array(0);
  private cellDim = new Float32Array(0);

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
  }

  setTheme(isLight: boolean) {
    this.isLight = isLight;
    this.palette = isLight ? LIGHT : DARK;
  }

  resize(width: number, height: number, dpr: number) {
    this.dpr = dpr;
    this.cw = clamp(Math.round(width / 180), 6, 8);
    this.ch = this.cw;
    this.cols = Math.ceil(width / this.cw);
    this.rows = Math.ceil(height / this.ch);
    this.ctx.canvas.width = Math.round(width * dpr);
    this.ctx.canvas.height = Math.round(height * dpr);

    const n = this.cols * this.rows;
    this.cellGlyph = new Uint16Array(n);
    this.cellColor = new Uint32Array(n);
    this.cellAlpha = new Float32Array(n);
    this.cellTile = new Uint32Array(n);
    this.cellTileAlpha = new Float32Array(n);
    this.cellDim = new Float32Array(n).fill(1);
  }

  setDimBoxes(boxes: Box[]) {
    const { cols, rows, cw, ch, cellDim } = this;
    cellDim.fill(1);
    const pad = cw * 4;
    for (const b of boxes) {
      const c0 = Math.max(0, Math.floor((b.left - pad) / cw));
      const c1 = Math.min(cols - 1, Math.floor((b.right + pad) / cw));
      const r0 = Math.max(0, Math.floor((b.top - pad) / ch));
      const r1 = Math.min(rows - 1, Math.floor((b.bottom + pad) / ch));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const x = c * cw + cw / 2;
          const y = r * ch + ch / 2;
          const d = Math.hypot(Math.max(b.left - x, 0, x - b.right), Math.max(b.top - y, 0, y - b.bottom));
          const i = r * cols + c;
          cellDim[i] = Math.min(cellDim[i], DIM_UNDER_CONTENT + (1 - DIM_UNDER_CONTENT) * smoothstep(0, pad, d));
        }
      }
    }
  }

  private style(rgb: number) {
    let s = this.styles.get(rgb);
    if (!s) {
      s = `rgb(${rgb >>> 16},${(rgb >>> 8) & 255},${rgb & 255})`;
      this.styles.set(rgb, s);
    }
    return s;
  }

  private glyphAt(i: number, glyph: string, rgb: Rgb, alpha: number) {
    const { ctx, cw, ch, cols } = this;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.style(packRgb(rgb));
    ctx.fillText(glyph, (i % cols) * cw + cw / 2, ((i / cols) | 0) * ch + ch / 2);
  }

  render(world: World, dt: number) {
    const { ctx, dpr, cols, rows } = this;
    if (cols === 0 || rows === 0) return;

    this.cellGlyph.fill(0);
    this.cellTileAlpha.fill(0);
    this.cellAlpha.fill(0);

    // Rasterize static and animated ASCII art tiles
    this.rasterizeArt(world);

    // Render pass
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `bold 900 ${Math.round(this.ch * 0.85)}px ${this.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    this.drawCells();
    this.drawPeanuts(world);
    ctx.globalAlpha = 1;
  }

  private rasterizeArt(world: World) {
    const { cols, rows, cellGlyph, cellColor, cellAlpha, cellTile, cellTileAlpha, palette, isLight } = this;
    const isSmall = cols < 110;

    // Subtle gentle animations
    const bob = Math.sin(world.time * 1.5) * 0.08;
    const sway = Math.sin(world.time * 1.2) * 0.06;

    for (let i = 0; i < ART_TILES.length; i++) {
      const t = ART_TILES[i];
      let dc: number;
      let dr: number;

      if (isSmall) {
        // Mobile / tablet screen: anchor in upper right
        dc = Math.round(cols * 0.68) + (t.c - MONKEY_ANCHOR_COL);
        dr = Math.round(rows * 0.28) + (t.r - MONKEY_ANCHOR_ROW);
      } else {
        // Desktop: anchor monkey at ~62% of cols, perched cleanly at ~44% rows
        const anchorCol = Math.round(cols * 0.62);
        const anchorRow = Math.round(rows * 0.44);
        dc = anchorCol + (t.c - MONKEY_ANCHOR_COL);
        dr = anchorRow + (t.r - MONKEY_ANCHOR_ROW);
      }

      const isMonkey = t.c >= 44 && t.c <= 80 && t.r >= 14 && t.r <= 70;
      if (isMonkey) {
        dr += bob;
        if (t.r > MONKEY_ANCHOR_ROW) {
          dc += sway * (t.r - MONKEY_ANCHOR_ROW) * 0.04;
        }
      }

      const gc = Math.round(dc);
      const gr = Math.round(dr);
      if (gc < 0 || gc >= cols || gr < 0 || gr >= rows) continue;

      const idx = gr * cols + gc;

      let fgRgb: Rgb = t.rgb;
      let bgRgb: Rgb = t.bgRgb ?? palette.bg;
      let bgAlpha = t.bgAlpha ?? 0;

      if (isLight) {
        if (bgAlpha > 0) {
          const isHighlight = t.bgRgb && (t.bgRgb[0] > 100 || t.bgRgb[1] > 90);
          if (isHighlight) {
            bgRgb = palette.face;
            bgAlpha = Math.min(bgAlpha, 0.35);
          } else {
            bgRgb = [228, 222, 214];
            bgAlpha = Math.min(bgAlpha, 0.40);
          }
        }
        const isCream = (t.rgb[0] > 200 && t.rgb[1] > 190 && t.rgb[2] > 180);
        if (isCream) {
          fgRgb = [48, 42, 36];
        } else if (t.rgb[0] > t.rgb[1] && t.rgb[0] > t.rgb[2]) {
          fgRgb = [
            Math.round(t.rgb[0] * 0.82),
            Math.round(t.rgb[1] * 0.65),
            Math.round(t.rgb[2] * 0.5),
          ];
        } else {
          fgRgb = [
            Math.min(t.rgb[0], 80),
            Math.min(t.rgb[1], 70),
            Math.min(t.rgb[2], 60),
          ];
        }
      }

      cellTile[idx] = packRgb(bgRgb);
      cellTileAlpha[idx] = bgAlpha;
      cellColor[idx] = packRgb(fgRgb);
      cellGlyph[idx] = t.g.charCodeAt(0);
      cellAlpha[idx] = 1;
    }
  }

  private drawCells() {
    const { ctx, cw, ch, cols, cellGlyph, cellColor, cellAlpha, cellTile, cellTileAlpha, cellDim } = this;
    const pad = 1;
    const tw = Math.max(1, cw - pad * 2);
    const th = Math.max(1, ch - pad * 2);
    const radius = 1.2;
    const lineWidth = Math.max(0.65, cw * 0.12);

    for (let i = 0; i < cellGlyph.length; i++) {
      const code = cellGlyph[i];
      if (!code && cellTileAlpha[i] === 0) continue;
      const x = (i % cols) * cw;
      const y = ((i / cols) | 0) * ch;

      if (cellTileAlpha[i] > 0) {
        ctx.globalAlpha = cellTileAlpha[i] * cellDim[i];
        ctx.fillStyle = this.style(cellTile[i]);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x + pad, y + pad, tw, th, radius);
        } else {
          ctx.rect(x + pad, y + pad, tw, th);
        }
        ctx.fill();
      }

      if (code && code !== 32) {
        const char = String.fromCharCode(code);
        ctx.globalAlpha = cellAlpha[i] * cellDim[i];
        const col = this.style(cellColor[i]);
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        ctx.lineWidth = lineWidth;
        ctx.strokeText(char, x + cw / 2, y + ch / 2);
        ctx.fillText(char, x + cw / 2, y + ch / 2);
      }
    }
  }

  private drawPeanuts(world: World) {
    const { cellGlyph, palette, ch, cw, cols, rows } = this;
    for (const p of world.peanuts) {
      const age = world.time - p.born;
      if (!p.landed) {
        const fall = age / p.landAt;
        const c = Math.floor(p.x / cw);
        const r = Math.floor((p.y - (1 - fall) * ch * 2) / ch);
        if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
        const i = r * cols + c;
        if (cellGlyph[i]) continue;
        this.glyphAt(i, fall < 0.5 ? "'" : '.', palette.peanut, 0.9);
        continue;
      }
      const c = Math.floor(p.x / cw);
      const r = Math.floor(p.y / ch);
      if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
      const i = r * cols + c;
      if (cellGlyph[i]) continue;
      const sink = smoothstep(PEANUT_FADE, PEANUT_LIFE, age);
      const bob = 0.85 + 0.15 * Math.sin(age * 3 + p.x);
      this.glyphAt(i, sink > 0.6 ? '.' : 'o', palette.peanut, bob * (1 - sink));
    }
  }
}
