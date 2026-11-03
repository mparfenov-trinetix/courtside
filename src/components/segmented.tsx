import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInRight,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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
}: {
  options: SegmentOption<K>[];
  value: K;
  onChange: (key: K, direction: 1 | -1) => void;
  segmentWidth?: number;
}) {
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const position = useSharedValue(index);

  useEffect(() => {
    position.set(withSpring(index, { damping: 18, stiffness: 220, mass: 0.8 }));
  }, [index, position]);

  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: position.get() * segmentWidth }],
  }));

  return (
    <View style={[styles.track, { width: options.length * segmentWidth + PAD * 2 }]}>
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
          style={[styles.button, { width: segmentWidth }]}>
          <Label text={o.label} index={i} position={position} />
        </Pressable>
      ))}
    </View>
  );
}

function Label({ text, index, position }: { text: string; index: number; position: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    color: interpolateColor(position.get(), [index - 1, index, index + 1], [palette.muted, palette.chalk, palette.muted]),
  }));
  return <Animated.Text style={[styles.label, style]}>{text}</Animated.Text>;
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
  button: { paddingVertical: 8, alignItems: 'center' },
  label: { fontFamily: fonts.bodySemi, fontSize: 14 },
});

/** Entering animation for content below a `Segmented`: slides in from the side it moved toward. */
export const slideIn = (direction: 1 | -1) =>
  (direction === 1 ? FadeInRight : FadeInLeft).duration(260).springify().damping(20).stiffness(200);
