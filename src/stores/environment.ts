import { atom } from 'nanostores';

export type DeviceTier = 'high' | 'medium' | 'low';

export interface QualityProfile {
  tier: DeviceTier;
  /** Upper bound for the canvas device pixel ratio. */
  maxDpr: number;
  /** Number of background stars rendered in the universe. */
  starCount: number;
  /**
   * Character cell width for the ASCII pass, in CSS pixels. The pass runs in
   * device pixels, so `AsciiEffect` scales it by the pixel ratio — otherwise
   * raising the resolution cap would silently halve the glyph size on a phone.
   */
  asciiCharSize: number;
}

/**
 * Device pixels per CSS pixel the canvas may render at, on every tier.
 *
 * Resolution is a property of the screen, not of the device's power: on a 3x
 * phone the old budget of 1 drew the universe at a third of the physical pixels
 * and the browser stretched it back up, which read as a blurry render. R3F
 * clamps this against the real `devicePixelRatio`, so a 1x screen still renders
 * at 1x. Tiers buy their headroom in particles, anti-aliasing and ASCII cell
 * size instead.
 */
const MAX_DPR = 2;

type TierBudget = Omit<QualityProfile, 'tier' | 'maxDpr'>;

const TIER_BUDGETS: Record<DeviceTier, TierBudget> = {
  high: { starCount: 5000, asciiCharSize: 8.5 },
  medium: { starCount: 3000, asciiCharSize: 9.5 },
  low: { starCount: 1500, asciiCharSize: 11 },
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function detectReducedMotion(): boolean {
  return isBrowser() && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function detectDeviceTier(): DeviceTier {
  if (!isBrowser()) return 'high';

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const constrained = cores <= 4 || memory <= 4;

  if (coarsePointer) return constrained ? 'low' : 'medium';
  return constrained ? 'medium' : 'high';
}

export const $deviceTier = atom<DeviceTier>(detectDeviceTier());
export const $prefersReducedMotion = atom<boolean>(detectReducedMotion());

/**
 * Resolution and density budget for the current device. Mobile and low-power
 * devices get a simplified universe instead of a downscaled desktop one.
 */
export function getQualityProfile(
  tier: DeviceTier = $deviceTier.get(),
  reducedMotion: boolean = $prefersReducedMotion.get()
): QualityProfile {
  const budget = TIER_BUDGETS[tier];

  return {
    tier,
    maxDpr: MAX_DPR,
    // Reduced motion thins the particle field; render resolution stays a device concern.
    starCount: reducedMotion
      ? Math.min(budget.starCount, TIER_BUDGETS.low.starCount)
      : budget.starCount,
    asciiCharSize: budget.asciiCharSize,
  };
}

/** Keep the atoms aligned with OS-level capability and motion preference changes. */
export function syncEnvironment(): () => void {
  if (!isBrowser()) return () => {};

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerQuery = window.matchMedia('(pointer: coarse)');

  const onMotionChange = (e: MediaQueryListEvent) => $prefersReducedMotion.set(e.matches);
  const onPointerChange = () => $deviceTier.set(detectDeviceTier());

  motionQuery.addEventListener('change', onMotionChange);
  pointerQuery.addEventListener('change', onPointerChange);

  return () => {
    motionQuery.removeEventListener('change', onMotionChange);
    pointerQuery.removeEventListener('change', onPointerChange);
  };
}
