import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronIcon, ChevronLeftIcon, Glass } from '@/components';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { TODAY_PILL_BOTTOM, TODAY_PILL_HEIGHT } from '../../constants';

/**
 * A small "‹ TODAY" / "TODAY ›" pill over the bottom of the day view, shown once another day is selected. The arrow points the way
 * today lies (left when you are in the future). It sits at the bottom centre, where the cards' own edges are, and is fully out of
 * the way (and out of the touch tree) while today is on screen.
 */
export function TodayPill({ visible, direction, onPress }: { visible: boolean; direction: 1 | -1; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(visible ? 1 : 0, { duration: visible ? 240 : 160, easing: Easing.out(Easing.cubic) }));
  }, [visible, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * 16 }, { scale: 0.92 + progress.get() * 0.08 }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + TODAY_PILL_BOTTOM }]}>
      <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={style}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            onPress();
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back to today"
          style={({ pressed }) => pressed && { opacity: 0.85 }}>
          <Glass interactive style={styles.pill} fallbackStyle={styles.pillPlain}>
            {direction === -1 ? <ChevronLeftIcon size={14} color={palette.chalk} /> : null}
            <Text style={styles.text}>TODAY</Text>
            {direction === 1 ? <ChevronIcon size={14} color={palette.chalk} /> : null}
          </Glass>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: TODAY_PILL_HEIGHT,
    paddingHorizontal: 14,
    borderRadius: TODAY_PILL_HEIGHT / 2,
  },
  // Without glass the pill needs its own surface, edge and shadow.
  pillPlain: {
    backgroundColor: palette.arenaRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(palette.chalk, 0.25),
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  text: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: palette.chalk },
});
