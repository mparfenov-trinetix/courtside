import { useEffect, useRef } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { withAlpha } from '@/lib/theme';

/**
 * Helpers for showing that live data just changed. Both react only to changes after
 * the first render, so screens don't flash when they open.
 */

const GOLD = '#FBBF24';

/** Runs `run` whenever `signature` changes after mount (not on the first render). */
function useOnChange(signature: string, run: () => void) {
  const previous = useRef(signature);
  useEffect(() => {
    if (previous.current === signature) return;
    previous.current = signature;
    run();
  });
}

/** A text value that slides up and fades in when it changes. */
export function Tick({ value, style }: { value: string | number; style?: StyleProp<TextStyle> }) {
  const progress = useSharedValue(1);
  useOnChange(String(value), () => {
    progress.set(0);
    progress.set(withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
  });
  const anim = useAnimatedStyle(() => ({
    opacity: 0.2 + 0.8 * progress.get(),
    transform: [{ translateY: (1 - progress.get()) * 6 }],
  }));
  return <Animated.Text style={[style, anim]}>{value}</Animated.Text>;
}

/**
 * A tinted overlay that lights up and fades out when `signature` changes. Place it inside
 * a positioned container (it fills the parent) and give it the parent's corner radius.
 */
export function FlashOverlay({
  signature,
  radius = 0,
  color = GOLD,
  duration = 2600,
}: {
  signature: string;
  radius?: number;
  color?: string;
  duration?: number;
}) {
  const flash = useSharedValue(0);
  useOnChange(signature, () => {
    flash.set(1);
    flash.set(withTiming(0, { duration, easing: Easing.out(Easing.quad) }));
  });
  // Colors are computed here: withAlpha is plain JS and can't run inside the UI-thread style worklet.
  const clear = withAlpha(color, 0);
  const fill = withAlpha(color, 0.22);
  const edge = withAlpha(color, 0.7);
  const anim = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(flash.get(), [0, 1], [clear, fill]),
    borderColor: interpolateColor(flash.get(), [0, 1], [clear, edge]),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1 }, anim]}
    />
  );
}
