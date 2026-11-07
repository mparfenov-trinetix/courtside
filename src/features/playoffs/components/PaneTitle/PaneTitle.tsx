import { StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { fonts, palette } from '@/lib/theme';

/**
 * A screen title for a pager: the pane names sit on top of each other and cross-fade as `page` (the pager's fractional position)
 * moves, with a dot per pane under the name so it is clear there is more to swipe to.
 */
export function PaneTitle({ labels, page }: { labels: string[]; page: SharedValue<number> }) {
  return (
    <View>
      <View style={styles.names}>
        {labels.map((label, i) => (
          <Name key={label} label={label} index={i} page={page} />
        ))}
      </View>
      <View style={styles.dots}>
        {labels.map((label, i) => (
          <Dot key={label} index={i} page={page} />
        ))}
      </View>
    </View>
  );
}

function Name({ label, index, page }: { label: string; index: number; page: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(page.get() - index);
    return {
      opacity: interpolate(d, [0, 0.7], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(d, [0, 1], [0, 6], Extrapolation.CLAMP) }],
    };
  });
  // The first name sets the width and height; the others lie on top of it.
  return (
    <Animated.Text style={[styles.name, index > 0 && styles.over, style]} numberOfLines={1}>
      {label}
    </Animated.Text>
  );
}

function Dot({ index, page }: { index: number; page: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(page.get() - index);
    return {
      opacity: interpolate(d, [0, 1], [1, 0.3], Extrapolation.CLAMP),
      width: interpolate(d, [0, 1], [14, 5], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  names: { minWidth: 104 },
  name: { fontFamily: fonts.displayBold, fontSize: 24, color: palette.chalk },
  over: { position: 'absolute', left: 0, top: 0 },
  dots: { flexDirection: 'row', gap: 4, marginTop: 1 },
  dot: { height: 5, borderRadius: 3, backgroundColor: palette.chalk },
});
