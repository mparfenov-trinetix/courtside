import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { Glass } from '@/components';
import { useStripFollow } from '@/hooks';
import { fonts, palette, withAlpha, surfaces } from '@/lib/theme';
import { PILL_GAP, PILL_HEIGHT, PILL_WIDTH, STRIP_PADDING } from './constants';

const STEP = PILL_WIDTH + PILL_GAP;

/**
 * A strip of stat pills built like the rosters' team pills: `page` is the pager's position as a fractional page, and the glass
 * highlight, the labels' colors and the strip's own scroll all move in lockstep with it, whatever moved the pager (a swipe, a tap,
 * a long jump). The pills are one width so the strip's position can be computed from `page` alone.
 */
export function StatPills({
  labels,
  page,
  selected,
  onSelect,
}: {
  labels: string[];
  page: SharedValue<number>;
  selected: number;
  onSelect: (index: number) => void;
}) {
  const { scrollRef, onScroll, contentStyle, contentWidth, tap, layout } = useStripFollow({
    page,
    step: STEP,
    padding: STRIP_PADDING,
    itemWidth: PILL_WIDTH,
    count: labels.length,
    gap: PILL_GAP,
  });
  const choose = (index: number) => {
    tap(index);
    onSelect(index);
  };
  const highlight = useAnimatedStyle(() => ({ transform: [{ translateX: STRIP_PADDING + page.get() * STEP }] }));

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onLayout={(e) => layout(e.nativeEvent.layout.width, selected)}
      style={styles.strip}
      contentContainerStyle={{ width: contentWidth, height: PILL_HEIGHT }}>
      {/* One layer for the pills and the highlight, moved together, so the highlight can never drift from them. */}
      <Animated.View style={[styles.layer, { width: contentWidth }, contentStyle]}>
        <View pointerEvents="none" style={styles.row}>
          {labels.map((label) => (
            <View key={label} style={styles.pill} />
          ))}
        </View>
        <Animated.View pointerEvents="none" style={[styles.highlight, highlight]}>
          <Glass tint={withAlpha(palette.chalk, 0.22)} style={styles.highlightGlass} fallbackStyle={styles.highlightPlain} />
        </Animated.View>
        <View style={styles.row}>
          {labels.map((label, index) => (
            <Pill key={label} label={label} index={index} page={page} on={index === selected} onPress={() => choose(index)} />
          ))}
        </View>
      </Animated.View>
    </Animated.ScrollView>
  );
}

function Pill({ label, index, page, on, onPress }: { label: string; index: number; page: SharedValue<number>; on: boolean; onPress: () => void }) {
  // Only the pills the highlight is on or between do any color work.
  const text = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(page.get() - index));
    return { color: near === 0 ? palette.muted : interpolateColor(near, [0, 1], [palette.muted, palette.chalk]) };
  });
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: on }} style={styles.pillPress}>
      <Animated.Text style={[styles.label, text]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // A fixed height that may not shrink: the pager beside it would otherwise squeeze the strip and cut the pills.
  strip: { height: PILL_HEIGHT, flexGrow: 0, flexShrink: 0, marginBottom: 4 },
  layer: { position: 'absolute', left: 0, top: 0, height: PILL_HEIGHT },
  row: { position: 'absolute', left: STRIP_PADDING, top: 0, flexDirection: 'row', gap: PILL_GAP },
  pill: { width: PILL_WIDTH, height: PILL_HEIGHT, borderRadius: PILL_HEIGHT / 2, backgroundColor: surfaces.card },
  pillPress: { width: PILL_WIDTH, height: PILL_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  highlight: { position: 'absolute', left: 0, top: 0, width: PILL_WIDTH, height: PILL_HEIGHT },
  highlightGlass: { width: PILL_WIDTH, height: PILL_HEIGHT, borderRadius: PILL_HEIGHT / 2 },
  highlightPlain: { backgroundColor: withAlpha(palette.chalk, 0.14), borderWidth: 1, borderColor: withAlpha(palette.chalk, 0.28) },
  label: { fontFamily: fonts.bodySemi, fontSize: 14 },
});
