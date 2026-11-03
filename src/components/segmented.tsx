import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { fonts, palette, withAlpha } from '@/lib/theme';

export type SegmentOption<K extends string> = { key: K; label: string };

const PAD = 3;

/**
 * A pill switcher whose highlight glides between options on a spring and whose labels
 * cross-fade as it passes. `onChange` also reports the direction (+1 right, -1 left)
 * so the content below can slide in from the matching side.
 */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  segmentWidth = 92,
  compact = false,
}: {
  options: SegmentOption<K>[];
  value: K;
  onChange: (key: K, direction: 1 | -1) => void;
  segmentWidth?: number;
  /** Smaller type and padding, for switchers that sit inside a card header. */
  compact?: boolean;
}) {
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const position = useSharedValue(index);

  useEffect(() => {
    position.set(withTiming(index, { duration: 240, easing: Easing.out(Easing.cubic) }));
  }, [index, position]);

  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: position.get() * segmentWidth }],
  }));

  return (
    <View style={[styles.track, compact && styles.trackCompact, { width: options.length * segmentWidth + PAD * 2 }]}>
      <Animated.View style={[styles.thumb, { width: segmentWidth }, thumb]} />
      {options.map((o, i) => (
        <Pressable
          key={o.key}
          onPress={() => {
            if (i === index) return;
            Haptics.selectionAsync();
            onChange(o.key, i > index ? 1 : -1);
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === index }}
          hitSlop={compact ? { top: 8, bottom: 8 } : undefined}
          style={[styles.button, compact && styles.buttonCompact, { width: segmentWidth }]}>
          <Label text={o.label} index={i} position={position} compact={compact} />
        </Pressable>
      ))}
    </View>
  );
}

function Label({ text, index, position, compact }: { text: string; index: number; position: SharedValue<number>; compact: boolean }) {
  const style = useAnimatedStyle(() => ({
    color: interpolateColor(position.get(), [index - 1, index, index + 1], [palette.muted, palette.chalk, palette.muted]),
  }));
  return <Animated.Text style={[styles.label, compact && styles.labelCompact, style]}>{text}</Animated.Text>;
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: PAD,
    borderRadius: 14,
    backgroundColor: withAlpha(palette.chalk, 0.07),
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: 11,
    backgroundColor: withAlpha(palette.chalk, 0.16),
  },
  trackCompact: { alignSelf: 'flex-start', borderRadius: 11 },
  button: { paddingVertical: 8, alignItems: 'center' },
  buttonCompact: { paddingVertical: 4 },
  label: { fontFamily: fonts.bodySemi, fontSize: 14 },
  labelCompact: { fontSize: 12 },
});

/**
 * Entering animation for content below a `Segmented` (and the game tabs): a quick fade with a short
 * slide from the side it moved toward. Eased, not sprung, so nothing overshoots.
 */
export const slideIn = (direction: 1 | -1) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateX: direction * 20 }] },
    100: { opacity: 1, transform: [{ translateX: 0 }], easing: Easing.out(Easing.cubic) },
  }).duration(220);
