import { router, type Href } from 'expo-router';

/** Game, team and player pages are pushed on top of each other; past this many, the top one is swapped instead. */
export const MAX_DETAIL_DEPTH = 3;

let detailDepth = 0;

/** A screen takes about this long to slide in or out: a second press before then is a double tap, not a second request. */
const SETTLE_MS = 700;
let busyUntil = 0;

/** True once per transition: the first call takes the lock, calls that follow within `SETTLE_MS` are refused. */
function free(): boolean {
  const now = Date.now();
  if (now < busyUntil) return false;
  busyUntil = now + SETTLE_MS;
  return true;
}

/** `router.push` that a double tap cannot repeat (it would push the same page twice and play its opening animation twice). */
export function pushOnce(href: Href) {
  if (free()) router.push(href);
}

/** Kept up to date by <NavDepthTracker/> in the root layout. */
export function setDetailDepth(n: number) {
  detailDepth = n;
}

/**
 * Back arrow for a page that may have been opened without anything under it (a widget, the Dynamic Island or a link
 * opened the app straight on a game): there is no history to go back to, so it goes to the home card instead of doing nothing.
 */
export function goBack() {
  // A double tap on a back arrow would go back twice, past the page it should land on.
  if (!free()) return;
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

/**
 * Open a game, team or player page. Pages normally stack, so back returns where you came from; but every
 * page in the stack stays alive, and jumping game -> team -> game -> team... piles them up. Once the stack
 * is MAX_DETAIL_DEPTH deep the current page is replaced instead of covered.
 */
export function openDetail(href: Href) {
  if (!free()) return;
  if (detailDepth >= MAX_DETAIL_DEPTH) router.replace(href);
  else router.push(href);
}
