import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { PeriodOption } from '@/lib/game-model';
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
}: {
  tab: GameTab;
  onTab: (t: GameTab) => void;
  accent: string;
  options: PeriodOption[];
  optionKey: string;
  onOption: (key: string) => void;
}) {
  const [width, setWidth] = useState(0);
  const index = TABS.findIndex((t) => t.key === tab);
  const position = useSharedValue(index);
  useEffect(() => {
    position.set(withSpring(index, { damping: 20, stiffness: 240 }));
  }, [index, position]);
  const segment = width / TABS.length;
  const underline = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() * segment }] }));

  return (
    <View style={styles.wrap}>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
            {options.map((o) => {
              const active = o.key === optionKey;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onOption(o.key);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
                  style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipLabel, active && { color: palette.chalk }]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: palette.arena, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.1) },
  tabs: { flexDirection: 'row', marginHorizontal: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.muted },
  underline: { position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 1 },
  periods: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  chipScroll: { flexShrink: 1 },
  chips: { gap: 6, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: withAlpha(palette.chalk, 0.06),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: { backgroundColor: withAlpha(palette.chalk, 0.14), borderColor: withAlpha(palette.chalk, 0.28) },
  chipLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
});
