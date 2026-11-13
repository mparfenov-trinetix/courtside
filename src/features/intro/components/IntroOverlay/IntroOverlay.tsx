import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Line } from 'react-native-svg';

import { Basketball, NbaLogo } from '@/components';
import { currentSeason } from '@/lib/espn';
import { leaderCategoryOptions, leagueTeamStatsOptions, prefetchGamesOnDay, seasonGamesOptions, teamsOptions } from '@/hooks';
import { localToday } from '@/lib/date';
import { endPreloadDrive, preloadWithin, setBehindIntro, whenIdle } from '@/navigation';
import { fonts, palette } from '@/lib/theme';
import { useTeamStore } from '@/state';
import { BALL, RING, WORD } from './constants';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

/** How long the animation plays, from the first toss to the end of the ring's echo. */
const ANIM_MS = 1600;
/**
 * After the animation, how long the intro may spend building more screens before it leaves: a step that has begun is finished, none begins
 * after this, and what is left is built after the intro (`endPreloadDrive`). It is what keeps the intro short on a slow device.
 */
const STEP_BUDGET_MS = 600;
/** The longest the intro waits for the home card to be built under the native splash. */
const HOME_BUILD_CAP_MS = 2000;

const fall = (to: number, ms: number) => withTiming(to, { duration: ms, easing: Easing.in(Easing.quad) });
const rise = (to: number, ms: number) => withTiming(to, { duration: ms, easing: Easing.out(Easing.quad) });

/**
 * The intro, drawn above the whole app (the root layout mounts it for a launch that starts on `/`). It is not a route: a route would have to
 * hand over to the app before the app is built, and the app's heavy screens cost a few hundred milliseconds each to build the first time. So
 * the app is built underneath it instead, and nobody can touch it meanwhile.
 *
 * Building a screen freezes whatever is moving, so the animation never overlaps it. The order: the native splash is still up (a still
 * picture of the ball), and under it `/home` is built (the drawer and the home card); then the splash goes and the animation plays, short
 * and in one piece; then, within a small time budget, the drawer builds its other heavy screens one at a time while the finished logo
 * stands still; then the fade. Whatever the budget did not cover is built after the intro has left. It cannot be noMotion: a tap on it does nothing, so the intro always plays whole (only Reduce Motion shortens it).
 */
export function IntroOverlay({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { hydrated, favoriteTeamId } = useTeamStore();
  const [finished, setFinished] = useState(false);
  // The same for everyone: the court in the app's own orange. No full-screen light behind the ball: a gradient layer over the whole
  // screen showed its rectangular edges and read as a blur at the end of the intro.
  const lineColor = palette.maple;
  const started = useRef(false);
  const leaving = useRef(false);
  const noMotion = useRef(false);
  const gone = useRef(false);
  const wake = useRef<(() => void) | null>(null);
  const team = useRef({ hydrated, favoriteTeamId });
  useEffect(() => {
    team.current = { hydrated, favoriteTeamId };
  }, [hydrated, favoriteTeamId]);
  useEffect(
    () => () => {
      gone.current = true;
      wake.current?.();
    },
    [],
  );

  const ballY = useSharedValue(0); // 0 = resting on the floor (screen center)
  const energy = useSharedValue(1); // squash strength, fades as the ball settles
  const ring = useSharedValue(0); // center circle draw progress
  const floor = useSharedValue(0); // half-court line draw progress
  const word = useSharedValue(0); // wordmark reveal
  const pulse = useSharedValue(0); // one ring of light leaving the center circle as it closes
  const exit = useSharedValue(0);

  // Warm the cache while the intro plays (three seconds in which the app is otherwise idle): the team list and its logos, then what
  // the screens people open first read (the team and player leaders, the Calendar's day and season). A first open then shows rows,
  // not skeletons and logos popping in, and data the disk cache restored stale is refreshed before it is needed, not in the middle
  // of a screen's slide-in. One at a time, so the intro's own frames are never competing with a burst of parsing.
  useEffect(() => {
    (async () => {
      const teams = await queryClient.fetchQuery(teamsOptions()).catch(() => undefined);
      if (teams) Image.prefetch(teams.map((t) => t.logoDark || t.logo).filter(Boolean)).catch(() => {});
      await queryClient.prefetchQuery(leagueTeamStatsOptions());
      await queryClient.prefetchQuery(leaderCategoryOptions('ppg'));
      prefetchGamesOnDay(queryClient, localToday());
    })();
  }, [queryClient]);
  // The stored favorite is known a moment after launch: its season is what the Calendar's strip and Month read.
  useEffect(() => {
    if (hydrated && favoriteTeamId) queryClient.prefetchQuery(seasonGamesOptions(favoriteTeamId, currentSeason()));
  }, [hydrated, favoriteTeamId, queryClient]);

  // Leave once the animation is done and the stored favorite is known. With a favorite the app is already showing underneath; a first launch
  // goes on to choosing a team, and the overlay stays up a moment while that screen draws.
  useEffect(() => {
    if (!finished || !hydrated) return;
    if (favoriteTeamId) {
      onDone();
      return;
    }
    router.replace('/onboarding');
    const t = setTimeout(onDone, 150);
    return () => clearTimeout(t);
  }, [finished, hydrated, favoriteTeamId, onDone]);

  /** Waits `ms` (leaving the screen ends the wait at once). */
  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      if (noMotion.current || gone.current) {
        resolve();
        return;
      }
      const done = () => {
        clearTimeout(timer);
        wake.current = null;
        resolve();
      };
      const timer = setTimeout(done, ms);
      wake.current = done;
    });

  /** Plays one animation value from 0 to 1 (at once under Reduce Motion). */
  const play = (value: SharedValue<number>, ms: number, easing: (t: number) => number, delay = 0) => {
    value.value = noMotion.current ? 1 : withDelay(delay, withTiming(1, { duration: ms, easing }));
  };

  const run = async () => {
    // Under the native splash, still: the drawer and the home card are built. (The favorite is normally known long before.)
    for (let waited = 0; !team.current.hydrated && waited < 1500 && !gone.current; waited += 50) {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }
    const favorite = team.current.favoriteTeamId;
    if (favorite && !gone.current) {
      setBehindIntro(true);
      router.replace('/home');
      await Promise.race([whenIdle(300, 200), new Promise<void>((resolve) => setTimeout(resolve, HOME_BUILD_CAP_MS))]);
    }
    if (gone.current) return;
    SplashScreen.hide();

    // The animation, in one piece: the toss and a decaying bounce, the court's line, the circle drawn around the ball as it settles, the
    // wordmark, the circle's echo.
    if (reducedMotion) {
      noMotion.current = true;
    } else {
      ballY.value = withSequence(
        rise(-150, 220),
        fall(0, 270),
        rise(-55, 180),
        fall(0, 180),
        rise(-14, 90),
        fall(0, 90),
      );
      energy.value = withDelay(900, withTiming(0, { duration: 180 }));
      floor.value = withDelay(300, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
      play(ring, 450, Easing.inOut(Easing.cubic), 780);
      play(word, 450, Easing.linear, 900);
      play(pulse, 450, Easing.out(Easing.cubic), 1100);
      await sleep(ANIM_MS);
    }

    // The finished logo stands still while more screens are built, as many as fit in the budget.
    if (favorite) await preloadWithin(STEP_BUDGET_MS, () => gone.current || noMotion.current);

    if (gone.current) return;
    if (reducedMotion) setFinished(true);
    else leave(noMotion.current ? 150 : 320);
  };

  const start = () => {
    if (started.current) return;
    started.current = true;
    run();
  };

  /** Fade out and hand over (the app behind is built). */
  const leave = (ms: number) => {
    if (leaving.current) return;
    leaving.current = true;
    endPreloadDrive();
    exit.value = withTiming(1, { duration: ms, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) scheduleOnRN(setFinished, true);
    });
  };

  const ballStyle = useAnimatedStyle(() => {
    // Squash near the floor; stronger while the ball still has energy.
    const nearFloor = interpolate(ballY.value, [-24, 0], [0, 1], 'clamp') * energy.value;
    return {
      transform: [
        { translateY: ballY.value + nearFloor * 6 },
        { scaleX: 1 + nearFloor * 0.14 },
        { scaleY: 1 - nearFloor * 0.12 },
        { scale: 1 + exit.value * 0.25 },
      ],
    };
  });

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ballY.value, [-170, 0], [0.12, 0.45]),
    transform: [{ scaleX: interpolate(ballY.value, [-170, 0], [0.45, 1]) }],
  }));

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - ring.value) * 2 * Math.PI * RING,
  }));

  const floorProps = useAnimatedProps(() => ({
    x1: width / 2 - (width / 2) * floor.value,
    x2: width / 2 + (width / 2) * floor.value,
  }));

  // The echo of the center circle: grows and fades once, as the circle finishes drawing.
  const pulseProps = useAnimatedProps(() => ({
    r: RING * (1 + 0.45 * pulse.value),
    strokeOpacity: 0.55 * (1 - pulse.value) * (pulse.value > 0 ? 1 : 0),
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(word.value, [0.6, 1], [0, 1], 'clamp'),
  }));

  const centerY = height / 2;

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, containerStyle]} onLayout={start}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <AnimatedLine
            y1={centerY + BALL / 2 + 2}
            y2={centerY + BALL / 2 + 2}
            stroke={lineColor}
            strokeOpacity={0.5}
            strokeWidth={2}
            animatedProps={floorProps}
          />
          <AnimatedCircle
            cx={width / 2}
            cy={centerY}
            r={RING}
            stroke={lineColor}
            strokeWidth={2.5}
            fill="none"
            strokeDasharray={`${2 * Math.PI * RING}`}
            strokeLinecap="round"
            rotation={-90}
            origin={`${width / 2}, ${centerY}`}
            animatedProps={ringProps}
          />
          <AnimatedCircle cx={width / 2} cy={centerY} stroke={lineColor} strokeWidth={2} fill="none" animatedProps={pulseProps} />
        </Svg>

        <Animated.View
          style={[styles.shadow, { top: centerY + BALL / 2 - 6, left: width / 2 - BALL * 0.4 }, shadowStyle]}
        />

        <Animated.View style={[styles.ball, { top: centerY - BALL / 2, left: width / 2 - BALL / 2 }, ballStyle]}>
          <Basketball size={BALL} />
        </Animated.View>

        <View style={[styles.wordWrap, { top: centerY + RING + 36 }]}>
          <View style={styles.word}>
            {WORD.split('').map((char, i) => (
              <Letter key={i} char={char} index={i} progress={word} />
            ))}
          </View>
          <Animated.Text style={[styles.tagline, taglineStyle]}>Every team. Every game.</Animated.Text>
          <Animated.View style={[styles.league, taglineStyle]}>
            <NbaLogo size={56} />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

function Letter({ char, index, progress }: { char: string; index: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const start = index * 0.06;
    const t = interpolate(progress.value, [start, start + 0.45], [0, 1], 'clamp');
    return {
      opacity: t,
      transform: [{ translateY: (1 - t) * 26 }, { rotateX: `${(1 - t) * 70}deg` }],
    };
  });
  return <Animated.Text style={[styles.letter, style]}>{char}</Animated.Text>;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: palette.arena,
  },
  ball: {
    position: 'absolute',
    width: BALL,
    height: BALL,
  },
  shadow: {
    position: 'absolute',
    width: BALL * 0.8,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#000',
  },
  wordWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  word: {
    flexDirection: 'row',
  },
  letter: {
    fontFamily: fonts.display,
    fontSize: 58,
    color: palette.chalk,
  },
  league: { marginTop: 18 },
  tagline: {
    marginTop: 2,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    letterSpacing: 0.5,
    color: palette.muted,
  },
});
