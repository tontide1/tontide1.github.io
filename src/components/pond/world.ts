/**
 * The pond world state: perched monkey, water drops dripping from the tail,
 * expanding concentric ripples, and peanuts dropped by visitor clicks.
 */

export const TAU = Math.PI * 2;
export const BODY_NODES = 20;
export const RIPPLE_SPEED = 48;

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Deterministic integer hash
export function hash3(x: number, y: number, z: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export type Box = { left: number; top: number; right: number; bottom: number };

export interface Monkey {
  id: number;
  size: number;
  fur: number;
  nodes: Float32Array;
  heading: number;
  speed: number;
  turn: number;
  wander: number;
  curiosity: number;
  hero: boolean;
  depth: number;
  phase: number;
}

export interface Peanut {
  x: number;
  y: number;
  born: number;
  landAt: number;
  landed: boolean;
  vx: number;
  vy: number;
}

export interface Ripple {
  x: number;
  y: number;
  born: number;
  strength: number;
  rxScale?: number;
}

export const PEANUT_LIFE = 12;
export const PEANUT_FADE = 8;
export const MAX_PEANUTS = 24;
export const RIPPLE_LIFE = 3.6;

export function rippleLife(rp: Ripple) {
  return RIPPLE_LIFE;
}

export class World {
  width = 0;
  height = 0;
  time = 0;
  monkeys: Monkey[] = [];
  peanuts: Peanut[] = [];
  ripples: Ripple[] = [];
  pointer = { x: 0, y: 0, speed: 0, active: false };
  avoid: Box[] = [];
  private lastDripTime = 0;
  private nextAmbient = 2.0;

  resize(width: number, height: number) {
    const first = this.width === 0;
    this.width = width;
    this.height = height;
    if (first) this.seed();
  }

  private seed() {
    this.monkeys = [];
    // 6 monkeys (representing the pond count shown in the design reference)
    for (let i = 0; i < 6; i++) {
      const nodes = new Float32Array(BODY_NODES * 2);
      this.monkeys.push({
        id: i + 1,
        size: 220,
        fur: i % 3,
        nodes,
        heading: 0,
        speed: 0,
        turn: 0,
        wander: 0,
        curiosity: 1,
        hero: i === 0,
        depth: 1,
        phase: rand(0, TAU),
      });
    }
  }

  drop(x: number, y: number) {
    this.ripples.push({ x, y, born: this.time, strength: 0.5 });
    const count = Math.min(3 + Math.floor(Math.random() * 2), MAX_PEANUTS - this.peanuts.length);
    for (let k = 0; k < count; k++) {
      const a = rand(0, TAU);
      const r = Math.sqrt(Math.random()) * 28;
      const drift = rand(2, 5);
      this.peanuts.push({
        x: x + Math.cos(a) * r * 1.3,
        y: y + Math.sin(a) * r,
        born: this.time,
        landAt: rand(0.18, 0.42),
        landed: false,
        vx: Math.cos(a) * drift,
        vy: Math.sin(a) * drift,
      });
    }
  }

  step(dt: number) {
    this.time += dt;
    this.pointer.speed *= Math.exp(-dt * 8);

    // Peanuts lifecycle
    const t = this.time;
    this.peanuts = this.peanuts.filter((p) => t - p.born < PEANUT_LIFE);
    for (const p of this.peanuts) {
      if (!p.landed) {
        if (t - p.born >= p.landAt) {
          p.landed = true;
          this.ripples.push({ x: p.x, y: p.y, born: t, strength: 0.3 });
        }
        continue;
      }
      const damp = Math.exp(-dt * 0.3);
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    this.ripples = this.ripples.filter((r) => t - r.born < RIPPLE_LIFE);
  }
}
