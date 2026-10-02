/**
 * Device-tier detection and the quality budget, asserted directly against the
 * source module. Node strips the types, so no bundler is involved.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { ROOT, createSuite } from './harness.mjs';

const ENTRY = path.join(ROOT, 'src', 'stores', 'environment.ts');
let instance = 0;

/**
 * Load a fresh copy of the module under a stubbed browser environment. The
 * cache-busting query is required because the atoms capture matchMedia at
 * import time, so every scenario needs its own instance.
 */
async function load({ coarse, cores, memory, reduce, withMatchMedia = true }) {
  const motionListeners = [];
  const pointerListeners = [];

  const fakeWindow = {
    devicePixelRatio: 3,
    ...(withMatchMedia
      ? {
          matchMedia(query) {
            const matches =
              query === '(prefers-reduced-motion: reduce)'
                ? reduce
                : query === '(pointer: coarse)'
                  ? coarse
                  : false;
            return {
              matches,
              media: query,
              addEventListener: (_t, cb) =>
                (query.includes('reduced-motion') ? motionListeners : pointerListeners).push(cb),
              removeEventListener: () => {},
            };
          },
        }
      : {}),
  };

  Object.defineProperty(globalThis, 'window', { value: fakeWindow, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'navigator', {
    value: { hardwareConcurrency: cores, deviceMemory: memory },
    configurable: true,
    writable: true,
  });

  const url = `${pathToFileURL(ENTRY).href}?v=${++instance}`;
  return { mod: await import(url), motionListeners, pointerListeners };
}

export default async function run() {
  const s = createSuite('environment store (src/stores/environment.ts)');

  // --- Device tier detection -------------------------------------------------
  {
    const { mod } = await load({ coarse: false, cores: 8, memory: 8, reduce: false });
    s.check('desktop 8c/8G is high tier', mod.$deviceTier.get() === 'high', mod.$deviceTier.get());
    s.note('desktop fine pointer 8c/8G', mod.$deviceTier.get());
  }
  {
    const { mod } = await load({ coarse: false, cores: 4, memory: 8, reduce: false });
    s.check('desktop 4 cores is medium tier', mod.$deviceTier.get() === 'medium', mod.$deviceTier.get());
    s.note('desktop fine pointer 4c', mod.$deviceTier.get());
  }
  {
    const { mod } = await load({ coarse: true, cores: 8, memory: 8, reduce: false });
    s.check('coarse pointer 8c is medium tier', mod.$deviceTier.get() === 'medium', mod.$deviceTier.get());
    s.note('coarse pointer 8c', mod.$deviceTier.get());
  }
  {
    const { mod } = await load({ coarse: true, cores: 4, memory: 4, reduce: false });
    s.check('coarse pointer 4c/4G is low tier', mod.$deviceTier.get() === 'low', mod.$deviceTier.get());
    s.note('coarse pointer 4c/4G (phone)', mod.$deviceTier.get());
  }

  // --- SSR / no matchMedia guard -------------------------------------------
  {
    const { mod } = await load({ coarse: false, cores: 8, memory: 8, reduce: false, withMatchMedia: false });
    s.check('no matchMedia falls back to high', mod.$deviceTier.get() === 'high', mod.$deviceTier.get());
    s.check('no matchMedia is not reduced motion', mod.$prefersReducedMotion.get() === false);
    s.note('no matchMedia (SSR guard)', mod.$deviceTier.get());
  }

  // --- Reduced motion detection ---------------------------------------------
  {
    const { mod } = await load({ coarse: false, cores: 8, memory: 8, reduce: true });
    s.check('reduce media query sets the atom', mod.$prefersReducedMotion.get() === true);
    s.note('prefers-reduced-motion: reduce', mod.$prefersReducedMotion.get());
  }

  // --- Quality budget --------------------------------------------------------
  {
    const { mod } = await load({ coarse: false, cores: 8, memory: 8, reduce: false });
    const budget = (tier) => mod.getQualityProfile(tier, false);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    s.check('high budget', same(budget('high'), { tier: 'high', maxDpr: 2, starCount: 5000, asciiCharSize: 8.5 }), JSON.stringify(budget('high')));
    s.check('medium budget', same(budget('medium'), { tier: 'medium', maxDpr: 2, starCount: 3000, asciiCharSize: 9.5 }), JSON.stringify(budget('medium')));
    s.check('low budget', same(budget('low'), { tier: 'low', maxDpr: 2, starCount: 1500, asciiCharSize: 11 }), JSON.stringify(budget('low')));

    // Reduced motion thins particles but must not silently drop desktop resolution.
    const reducedHigh = mod.getQualityProfile('high', true);
    s.check('reduced motion thins the starfield to the low count', reducedHigh.starCount === 1500, String(reducedHigh.starCount));
    s.check('reduced motion keeps desktop maxDpr', reducedHigh.maxDpr === 2, String(reducedHigh.maxDpr));
    s.note('high/medium/low budgets', '5000/3000/1500 stars, dpr 2/2/2');
    s.note('reduced motion on high tier', `stars=${reducedHigh.starCount} maxDpr=${reducedHigh.maxDpr}`);
  }

  // --- syncEnvironment reacts to OS changes --------------------------------
  {
    const { mod, motionListeners, pointerListeners } = await load({
      coarse: false, cores: 8, memory: 8, reduce: false,
    });
    const stop = mod.syncEnvironment();
    s.check('syncEnvironment returns a cleanup function', typeof stop === 'function');
    s.check('subscribes to reduced-motion changes', motionListeners.length === 1, String(motionListeners.length));
    s.check('subscribes to pointer capability changes', pointerListeners.length === 1, String(pointerListeners.length));

    s.check('motion atom starts false', mod.$prefersReducedMotion.get() === false);
    motionListeners[0]({ matches: true });
    s.check('motion atom follows the OS preference', mod.$prefersReducedMotion.get() === true);
    s.check('the live profile reacts to the motion change', mod.getQualityProfile().starCount === 1500, String(mod.getQualityProfile().starCount));

    stop();
    s.note('syncEnvironment', 'subscribes + cleans up');
  }

  return s;
}
