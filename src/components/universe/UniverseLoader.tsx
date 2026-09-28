import React, { Suspense, useEffect, useState } from 'react';

// UniverseCanvas is a named export, so map it onto lazy's default shape.
const UniverseCanvas = React.lazy(() =>
  import('./UniverseCanvas').then((module) => ({ default: module.UniverseCanvas }))
);

/** `requestIdleCallback` is not in every browser's lib.dom typing. */
type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Defers the WebGL bundle until the main thread is idle.
 *
 * spec.md §14 asks for the HTML shell to render before heavy WebGL
 * initialisation, and for heavy visual modules to be lazy-loaded. The canvas is
 * the only heavy module on the page and nothing visible depends on it, so it can
 * arrive after first paint. The parent <main> already paints the same background,
 * so the delay introduces no flash and no layout shift.
 */
export const UniverseLoader: React.FC = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const win = window as IdleWindow;
    let cancelled = false;
    const start = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof win.requestIdleCallback === 'function') {
      const handle = win.requestIdleCallback(start, { timeout: 1200 });
      return () => {
        cancelled = true;
        win.cancelIdleCallback?.(handle);
      };
    }

    const handle = window.setTimeout(start, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, []);

  return <Suspense fallback={null}>{ready ? <UniverseCanvas /> : null}</Suspense>;
};
