import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { withAlpha } from '@/lib/theme';

const PulseContext = createContext<SharedValue<number> | null>(null);

function usePulse(enabled: boolean) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!enabled) return;
    pulse.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [enabled, pulse]);
  return pulse;
}

/** Puts every skeleton inside it on one shared pulse, so a whole placeholder breathes together. */
export function SkeletonGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const pulse = usePulse(!reduced);
  return (
    <PulseContext.Provider value={pulse}>
      <View style={style}>{children}</View>
    </PulseContext.Provider>
  );
}

/** A grey block that stands in for content that is still loading. */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
  still = false,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  /** Drawn but not pulsing: for placeholders that are only scrolled past (no animation work at all). */
  still?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const shared = useContext(PulseContext);
  const reduced = useReducedMotion();
  const own = usePulse(!shared && !reduced && !still);
  const pulse = shared ?? own;
  const anim = useAnimatedStyle(() => ({ opacity: still ? 0.8 : 0.55 + 0.45 * pulse.get() }));
  return <Animated.View style={[styles.block, { width, height, borderRadius: radius }, anim, style]} />;
}

const styles = StyleSheet.create({
  block: { backgroundColor: withAlpha('#FFFFFF', 0.1) },
});
