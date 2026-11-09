import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Whether the drawer screen this component sits in is at rest: true unless the screen is in the middle of sliding in from the menu.
 * Provided by `SceneFrame` (the wrapper around every drawer screen); anywhere else (a game, player or team page) there is no slide
 * to wait for, so it is true.
 */
export const SceneSettledContext = createContext(true);

/** The shortest wait: it lets a `settled` that is about to turn false (a screen that has just come back into focus) do so first. */
const MIN_PAD_MS = 50;

/**
 * False until the screen has finished sliding in from the menu (plus `padMs`), then true for good. For the heavy second pass of a
 * screen (the rest of a list, a neighbouring pager page, a prefetch), so it never lands inside the slide: every drawer screen used
 * its own timer for this (350, 700, 900 ms), and the ones that were shorter than the slide hitched in the middle of it.
 */
export function useSceneSettled(padMs = 0) {
  const settled = useContext(SceneSettledContext);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!settled || ready) return;
    const timer = setTimeout(() => setReady(true), Math.max(MIN_PAD_MS, padMs));
    return () => clearTimeout(timer);
  }, [settled, ready, padMs]);
  return ready;
}
