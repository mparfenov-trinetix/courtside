import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

let behindIntro = false;
/** The intro overlay is up: the drawer that mounts now is built behind it, one screen per `preloadStep`. */
export const setBehindIntro = (value: boolean) => {
  behindIntro = value;
};

/** After a screen has been asked for: at least this long, then this much quiet, before it counts as built (its data arriving, its effects running). */
const STEP_MIN_MS = 150;
const STEP_QUIET_MS = 100;

/**
 * Settles once `minMs` have passed and the app has then run `quietMs` of frames on time, counted from the last late frame (a frame more than
 * 24 ms after the one before it: the JS thread or the main thread was busy). A screen that has just been asked for starts building a moment
 * later, not at once, so "a frame on time" alone would call it quiet before it has begun.
 */
export function whenIdle(minMs: number, quietMs = 150) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    let last = start;
    let lastLate = start;
    const tick = () => {
      const now = performance.now();
      if (now - last > 24) lastLate = now;
      last = now;
      if (now - start >= minMs && now - lastLate >= quietMs) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Set by the drawer layout while the intro drives the build: mounts the next screen and settles when it is built; true while more remain. */
let step: (() => Promise<boolean>) | null = null;
/** Set with `step`: hands the screens the intro did not get to over to timers. */
let release: (() => void) | null = null;

/** The intro is leaving: the screens it did not have time for are built gently now, with the user on the home card. */
export function endPreloadDrive() {
  release?.();
}

/**
 * One step of the build behind the intro: the next screen is mounted, and this settles once the app has gone quiet again (so the intro can
 * play its next stretch of animation on an idle thread, not under a view-creating commit). True while more screens remain. Waits (briefly) for
 * the drawer, which only starts offering steps once it has mounted.
 */
export async function preloadStep(): Promise<boolean> {
  const start = Date.now();
  while (!step && Date.now() - start < 1500) await new Promise<void>((resolve) => setTimeout(resolve, 30));
  return step ? step() : false;
}

/**
 * Builds screens, one step at a time, for as long as `budgetMs` allows: a step that has begun is finished, none begins after the budget is
 * used up (or once `stop()` is true). What is left is for `endPreloadDrive` to hand to timers.
 */
export async function preloadWithin(budgetMs: number, stop: () => boolean) {
  const deadline = Date.now() + budgetMs;
  while (!stop() && Date.now() < deadline && (await preloadStep())) {
    // each step settles when the app has gone quiet again
  }
}

/** How the screens are paced when nothing drives them: gently, while the user sits on the home card. */
export const PRELOAD_PACE = {
  idle: { firstMs: 1500, gapMs: 1200 },
  /** Screens that are cheap to build: after the intro has left and the user has had the home card to themselves for a while. */
  later: { firstMs: 4500, gapMs: 1200 },
} as const;

/** The pace for a drawer layout that is mounting now. */
export const currentPreloadPace = () => PRELOAD_PACE.idle;

/**
 * Mounts drawer screens in the background, one after another, so the first visit to each is as cheap as the second.
 *
 * The drawer mounts a screen on its first visit, in the same moments the menu closes and the screen slides in: the Calendar's pager and
 * strip, a roster page, a leaders list are built then, and the JS thread is blocked for the better part of half a second (measured in
 * the simulator: stalls of 180, 330 and 360 ms while the slide runs). A second visit has nothing to build and is smooth. `router.prefetch`
 * renders the screen without focusing it, so that cost is paid out of sight.
 *
 * Two ways of pacing it. Behind the intro (`driven`, and the intro is up) the intro asks for one screen at a time (`preloadStep`) and plays
 * its animation only in the gaps, because a screen being built freezes whatever moves meanwhile (a ball, a ring being drawn): the build
 * never overlaps the motion. Otherwise (a link opened a game and the drawer is underneath, or a screen the intro does not wait for) timers
 * space the screens out while the user sits on the home card.
 * `hrefs` must be a stable array (a module-level constant), and so must `pace`.
 */
export function usePreloadScreens(hrefs: readonly Href[], enabled: boolean, pace: { firstMs: number; gapMs: number }, driven = true) {
  useEffect(() => {
    if (!enabled) return;
    if (driven && behindIntro) {
      let next = 0;
      const later: ReturnType<typeof setTimeout>[] = [];
      step = async () => {
        if (next >= hrefs.length) return false;
        router.prefetch(hrefs[next++]);
        await whenIdle(STEP_MIN_MS, STEP_QUIET_MS);
        return next < hrefs.length;
      };
      release = () => {
        step = null;
        release = null;
        hrefs.slice(next).forEach((href, i) => later.push(setTimeout(() => router.prefetch(href), pace.firstMs + i * pace.gapMs)));
        next = hrefs.length;
      };
      return () => {
        step = null;
        release = null;
        later.forEach(clearTimeout);
      };
    }
    const timers = hrefs.map((href, i) => setTimeout(() => router.prefetch(href), pace.firstMs + i * pace.gapMs));
    return () => timers.forEach(clearTimeout);
  }, [hrefs, enabled, pace, driven]);
}
