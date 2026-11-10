import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { PeriodOption } from '@/lib/game';
import { PeriodChips } from '../PeriodChips';
import { fonts, palette, withAlpha } from '@/lib/theme';

export type GameTab = 'summary' | 'box' | 'plays' | 'shots';

const TABS: { key: GameTab; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'box', label: 'Box score' },
  { key: 'plays', label: 'Plays' },
  { key: 'shots', label: 'Shots' },
];

/**
 * Pinned under the top bar while you scroll: the four tabs and, below them, the period filter
 * that applies to the box score, plays, shots and summary stats.
 */
export function GameStickyBar({
  tab,
  onTab,
  accent,
  options,
  optionKey,
  onOption,
  pinned,
  tint,
}: {
  tab: GameTab;
  onTab: (t: GameTab) => void;
  accent: string;
  options: PeriodOption[];
  optionKey: string;
  onOption: (key: string) => void;
  /** 0 while the bar is still in flow with the page, 1 once it is pinned over scrolling content. */
  pinned: SharedValue<number>;
  /** Opaque left and right colors of the team-colored header surface. */
  tint: [string, string];
}) {
  const [width, setWidth] = useState(0);
  const index = TABS.findIndex((t) => t.key === tab);
  const position = useSharedValue(index);
  useEffect(() => {
    position.set(withTiming(index, { duration: 240, easing: Easing.out(Easing.cubic) }));
  }, [index, position]);
  const segment = width / TABS.length;
  // Nothing scrolls under the bar until it pins, so it stays see-through (the page's own wash shows)
  // and only becomes an opaque team-colored surface as it reaches the top.
  const surface = useAnimatedStyle(() => ({ opacity: pinned.get() }));
  const underline = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() * segment }] }));

  return (
    <View style={styles.wrap}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, surface]}>
        <LinearGradient colors={tint} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {/* A soft shadow where content slides under the pinned bar, instead of a hard cut. */}
      <Animated.View pointerEvents="none" style={[styles.edge, surface]}>
        <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={styles.tabs} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => {
                if (active) return;
                Haptics.selectionAsync();
                onTab(t.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={styles.tab}>
              <Text style={[styles.tabLabel, active && { color: palette.chalk }]}>{t.label}</Text>
            </Pressable>
          );
        })}
        {width > 0 && <Animated.View style={[styles.underline, { width: segment, backgroundColor: accent }, underline]} />}
      </View>

      {options.length > 1 && (
        <View style={styles.periods}>
          <PeriodChips options={options} activeKey={optionKey} onChange={onOption} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.08) },
  edge: { position: 'absolute', left: 0, right: 0, top: '100%', height: 16 },
  tabs: { flexDirection: 'row', marginHorizontal: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.muted },
  underline: { position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 1 },
  periods: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
});
