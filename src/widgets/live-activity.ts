import type { LiveActivityDismissalPolicy } from 'expo-widgets';
import { Platform } from 'react-native';

import type { GameSummary } from '@/lib/espn';
import { shareLogos } from './logos';
import { buildLiveGameProps, isTrackable, type LiveGameProps } from './live-game';

type Activity = { update: (props: LiveGameProps, staleDate?: Date) => Promise<void>; end: (policy?: LiveActivityDismissalPolicy, props?: LiveGameProps, contentDate?: Date) => Promise<void> };

/** An activity the system keeps this long past a score update before it may dim it as out of date. */
const STALE_AFTER_MS = 5 * 60 * 1000;
/** A finished game's score stays on the lock screen for a while before it clears. */
const LINGER_MS = 15 * 60 * 1000;

let current: { gameId: string; activity: Activity } | null = null;

/** Loaded lazily: importing expo-widgets resolves a native module, which Expo Go and web don't have. */
function layout() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('./live-game-activity') as typeof import('./live-game-activity')).default;
}

/**
 * Keeps one Live Activity in step with a game: starts it when the game is on, updates it with every new score, ends it
 * (leaving the final score up for a while) when the game is over. Pass `null` when nothing should be tracked. Safe
 * everywhere: where there are no Live Activities (Expo Go, web, Android, the Simulator below iOS 16.2, or the user turned
 * them off) it quietly does nothing.
 *
 * While the app is in the foreground it is fed by the same polling as the game page; with the app closed the activity
 * only moves if a server pushes to it (see `enablePushNotifications` in `app.json` and the push token on the activity).
 */
export async function syncLiveActivity(game: GameSummary | null) {
  if (Platform.OS !== 'ios') return;
  try {
    const factory = layout();

    // A relaunch finds the activity the last run started; adopt it rather than leave a second one behind.
    if (!current) {
      const [existing] = factory.getInstances();
      if (existing && game && isTrackable(game)) current = { gameId: game.id, activity: existing };
    }

    if (!game || (current && current.gameId !== game.id)) {
      if (current) await current.activity.end('immediate');
      current = null;
      if (!game) return;
    }

    if (isTrackable(game)) {
      const logos = await shareLogos([game.away.team.logoDark || game.away.team.logo, game.home.team.logoDark || game.home.team.logo]);
      const props = buildLiveGameProps(game, logos);
      const stale = new Date(Date.now() + STALE_AFTER_MS);
      if (current) await current.activity.update(props, stale);
      else current = { gameId: game.id, activity: factory.start(props, `courtside://game/${game.id}`, stale) };
    } else if (game.completed && current) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { after } = require('expo-widgets') as typeof import('expo-widgets');
      await current.activity.end(after(new Date(Date.now() + LINGER_MS)), buildLiveGameProps(game), new Date());
      current = null;
    }
  } catch {
    // No Live Activity support in this build, or they are switched off for the app.
  }
}
