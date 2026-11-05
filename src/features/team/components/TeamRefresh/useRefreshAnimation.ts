import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PULL_TO_REFRESH } from './constants';
import type { TeamMotion } from './types';

const tick = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

/** What the team card needs to play its refresh: a clock, how much it is playing, and a punch at the threshold. */
export type RefreshAnimation = {
  /** The loop's progress (0..1): runs only while refreshing, and rests at 0 otherwise (pulling alone plays nothing). */
  clock: SharedValue<number>;
  /** 1 while refreshing (and while the last loop finishes), 0 otherwise. */
  busy: SharedValue<number>;
  /** How far the page is pulled, 0..1 (1 = letting go refreshes). */
  progress: SharedValue<number>;
  /** A short 0..1..0 pulse the moment the pull reaches the threshold. */
  punch: SharedValue<number>;
  motion: TeamMotion;
};

/**
 * The state of the team card's refresh animation. Pulling plays nothing; once the pull is let go and refreshing starts it loops, and when the data is back the loop in progress finishes, so the logo comes to rest instead of snapping.
 * `scrollY` is the page's real scroll offset (negative while pulled).
 */
export function useRefreshAnimation({ refreshing, scrollY, motion }: { refreshing: boolean; scrollY: SharedValue<number>; motion: TeamMotion }): RefreshAnimation {
  const run = useSharedValue(0);
  const busy = useSharedValue(0);
  const punch = useSharedValue(0);

  const progress = useDerivedValue(() => Math.min(1, Math.max(0, -scrollY.get()) / PULL_TO_REFRESH));
  const clock = useDerivedValue(() => (busy.get() > 0.5 ? run.get() : 0));

  useEffect(() => {
    const { period } = motion;
    if (refreshing) {
      busy.set(1);
      run.set(0);
      run.set(withRepeat(withTiming(1, { duration: period, easing: Easing.linear }), -1, false));
    } else if (busy.get() > 0) {
      // Let the loop in progress run out, then hand the clock back to the pull.
      cancelAnimation(run);
      run.set(
        withTiming(1, { duration: (1 - run.get()) * period, easing: Easing.linear }, (finished) => {
          if (finished) busy.set(0);
        }),
      );
    }
  }, [refreshing, motion, busy, run, progress]);

  // Letting go now would refresh: a light tick, and the card punches.
  useAnimatedReaction(
    () => progress.get() >= 1,
    (full, was) => {
      if (!full || was) return;
      punch.set(withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 240 })));
      scheduleOnRN(tick);
    },
  );

  return { clock, busy, progress, punch, motion };
}
