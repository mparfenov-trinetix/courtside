import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Glass } from '@/components';
import { CALENDAR_MODES, type CalendarMode } from '../../constants';
import { fonts, palette, withAlpha, surfaces } from '@/lib/theme';

const OPEN_MS = 280;
const CLOSE_MS = 200;

/**
 * "Calendar view" bottom sheet: Day, Month or Agenda. It replaces a full-width switcher row, so the page keeps that height.
 * The dim and the sheet are animated by hand (the Modal itself has no animation) so the backdrop fades instead of sliding up
 * with the sheet; the Modal stays mounted until the close animation has finished.
 */
export function ViewSheet({
  visible,
  mode,
  onPick,
  onClose,
}: {
  visible: boolean;
  mode: CalendarMode;
  onPick: (mode: CalendarMode) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  // Stays true through the close animation; opening it is derived during render, closing it happens when the animation ends.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const progress = useSharedValue(0);
  const height = useSharedValue(400);

  const unmount = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (visible) {
      progress.set(withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) }));
    } else {
      progress.set(
        withTiming(0, { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) scheduleOnRN(unmount);
        }),
      );
    }
  }, [visible, progress, unmount]);

  const dim = useAnimatedStyle(() => ({ opacity: progress.get() * 0.5 }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.get()) * height.get() }] }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dim]}>
          <Pressable accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View onLayout={(e) => height.set(e.nativeEvent.layout.height)} style={sheet}>
          <Glass tint={withAlpha(palette.arena, 0.55)} style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} fallbackStyle={styles.sheetPlain}>
          <View style={styles.head}>
            <Text style={styles.title}>Calendar view</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          {CALENDAR_MODES.map(({ key, label, Icon }) => {
            const on = key === mode;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  if (!on) Haptics.selectionAsync();
                  onPick(key);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.7 }]}>
                <Icon color={on ? palette.chalk : palette.muted} size={24} />
                <Text style={[styles.rowText, on && { color: palette.chalk }]}>{label}</Text>
                {on ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
          </Glass>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  dim: { backgroundColor: '#000000' },
  sheetPlain: { backgroundColor: palette.arenaRaised },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 6 },
  title: { fontFamily: fonts.displayBold, fontSize: 22, color: palette.chalk },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: surfaces.raised },
  closeText: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 14, marginBottom: 6, borderRadius: 16 },
  rowOn: { backgroundColor: surfaces.raised },
  rowText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 18, color: palette.muted },
  check: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.chalk },
});
