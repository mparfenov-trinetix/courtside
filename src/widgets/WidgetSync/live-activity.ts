import type { LiveActivityDismissalPolicy } from 'expo-widgets';
import { Platform } from 'react-native';

import type { GameSummary } from '@/lib/espn';
import { buildLiveGameProps, planActivity, type LiveGameProps } from '@/lib/widgets';
import { shareLogos } from './logos';

type Activity = { update: (props: LiveGameProps, staleDate?: Date) => Promise<void>; end: (policy?: LiveActivityDismissalPolicy, props?: LiveGameProps, contentDate?: Date) => Promise<void> };

/** An activity the system keeps this long past a score update before it may dim it as out of date. */
const STALE_AFTER_MS = 5 * 60 * 1000;
/** A finished game's score stays on the lock screen for a while before it clears. */
const LINGER_MS = 15 * 60 * 1000;

/** `gameId` is null for an activity adopted after a relaunch: the system cannot say which game it shows. */
let current: { gameId: string | null; activity: Activity } | null = null;

/** Loaded lazily: importing expo-widgets resolves a native module, which Expo Go and web don't have. */
function layout() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('../LiveGameActivity') as typeof import('../LiveGameActivity')).LiveGameActivity;
}

/** An activity call that may fail (it ended, the user cleared it): false instead of a throw that would stop the rest of the sync. */
async function attempt(call: () => Promise<void>): Promise<boolean> {
  try {
    await call();
    return true;
  } catch {
    return false;
  }
}

/**
 * Keeps one Live Activity in step with a game: starts it when the game is on, updates it with every new score, ends it
 * (leaving the final score up for a while) when the game is over. Pass `null` when nothing should be tracked, and never while the
 * game is only still loading (that would clear the activity). Safe everywhere: where there are no Live Activities (Expo Go, web,
 * Android, the Simulator below iOS 16.2, or the user turned them off) it quietly does nothing.
 *
 * Calls run one after another: starting waits on the logo files, and two overlapping calls used to start two activities.
 * An activity the last run left (a relaunch, a reload in development) is always adopted first, so it is updated, finished or
 * cleared, not left frozen on a score from hours ago.
 *
 * While the app is in the foreground it is fed by the same polling as the game page; with the app closed the activity
 * only moves if a server pushes to it (see `enablePushNotifications` in `app.json` and the push token on the activity).
 */
export function syncLiveActivity(game: GameSummary | null): Promise<void> {
  queue = queue.then(() => run(game)).catch(() => {});
  return queue;
}

let queue: Promise<void> = Promise.resolve();

async function run(game: GameSummary | null) {
  if (Platform.OS !== 'ios') return;
  try {
    const factory = layout();

    // A relaunch finds the activity the last run started: take it over (and clear any extra the earlier runs left behind).
    if (!current) {
      const [first, ...extra] = factory.getInstances();
      if (first) current = { gameId: null, activity: first };
      for (const stray of extra) await attempt(() => stray.end('immediate'));
    }

    let plan = planActivity(game, current);
    if (plan === 'none' || !game) {
      if (plan === 'end' && current) {
        await attempt(() => current!.activity.end('immediate'));
        current = null;
      }
      return;
    }

    if (plan === 'end' || plan === 'replace') {
      if (current) await attempt(() => current!.activity.end('immediate'));
      current = null;
      if (plan === 'end') return;
      plan = 'start';
    }

    const logos = await shareLogos([game.away.team.logoDark || game.away.team.logo, game.home.team.logoDark || game.home.team.logo]);
    const props = buildLiveGameProps(game, logos);

    if (plan === 'finish' && current) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { after } = require('expo-widgets') as typeof import('expo-widgets');
      await attempt(() => current!.activity.end(after(new Date(Date.now() + LINGER_MS)), props, new Date()));
      current = null;
      return;
    }

    const stale = new Date(Date.now() + STALE_AFTER_MS);
    if (plan === 'update' && current) {
      // It may have ended or been cleared since (an adopted one, say): then it cannot be updated, and a fresh one goes up.
      if (await attempt(() => current!.activity.update(props, stale))) {
        current.gameId = game.id;
        return;
      }
      current = null;
    }
    current = { gameId: game.id, activity: factory.start(props, `courtside://game/${game.id}`, stale) };
  } catch {
    // No Live Activity support in this build, or they are switched off for the app.
  }
}
