import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { useTeam } from '@/hooks';
import { fetchTeams } from '@/lib/espn';
import { fonts, palette, teamTheme } from '@/lib/theme';
import { useTeamStore } from '@/state';
import { BALL, RING, WORD } from './constants';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

const fall = (to: number, ms: number) => withTiming(to, { duration: ms, easing: Easing.in(Easing.quad) });
const rise = (to: number, ms: number) => withTiming(to, { duration: ms, easing: Easing.out(Easing.quad) });

export function IntroScreen() {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { hydrated, favoriteTeamId } = useTeamStore();
  const [finished, setFinished] = useState(false);
  // Returning users see the court drawn in their own team's color (the teams list is prefetched below).
  const favorite = useTeam(favoriteTeamId);
  const lineColor = favorite ? teamTheme(favorite).accent : palette.maple;
  const started = useRef(false);

  const ballY = useSharedValue(0); // 0 = resting on the floor (screen center)
  const energy = useSharedValue(1); // squash strength, fades as the ball settles
  const ring = useSharedValue(0); // center circle draw progress
  const floor = useSharedValue(0); // half-court line draw progress
  const word = useSharedValue(0); // wordmark reveal
  const exit = useSharedValue(0);

  // Warm the cache while the intro plays, so team pickers open instantly.
  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: ['teams'], queryFn: fetchTeams });
  }, [queryClient]);

  // Leave once the animation is done and the stored favorite is known.
  useEffect(() => {
    if (finished && hydrated) router.replace(favoriteTeamId ? '/home' : '/onboarding');
  }, [finished, hydrated, favoriteTeamId]);

  const start = () => {
    if (started.current) return;
    started.current = true;
    SplashScreen.hide();

    if (reducedMotion) {
      setFinished(true);
      return;
    }

    // Toss up, then a decaying bounce on the court.
    ballY.value = withSequence(
      rise(-170, 300),
      fall(0, 400),
      rise(-70, 260),
      fall(0, 260),
      rise(-18, 130),
      fall(0, 130),
    );
    energy.value = withDelay(1300, withTiming(0, { duration: 200 }));
    floor.value = withDelay(650, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    ring.value = withDelay(1250, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.cubic) }));
    word.value = withDelay(1450, withTiming(1, { duration: 700 }));
    exit.value = withDelay(
      2700,
      withTiming(1, { duration: 380, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) scheduleOnRN(setFinished, true);
      }),
    );
  };

  const skip = () => {
    if (!started.current) return;
    exit.value = withTiming(1, { duration: 200 }, (done) => {
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

  const containerStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(word.value, [0.6, 1], [0, 1], 'clamp'),
  }));

  const centerY = height / 2;

  return (
    <Pressable style={styles.root} onPress={skip} accessibilityLabel="Skip intro">
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
    </Pressable>
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
    flex: 1,
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
