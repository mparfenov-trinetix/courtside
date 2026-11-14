import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Glass } from '../Glass';
import type { ComponentType } from 'react';

import { SHEET_MAX } from '@/lib/layout';

import { fonts, palette, withAlpha, surfaces } from '@/lib/theme';

const OPEN_MS = 280;
const CLOSE_MS = 200;

/** One choice of an `OptionSheet`: its icon, its name and, optionally, a line saying what it shows. */
export type SheetOption<K extends string> = { key: K; label: string; hint?: string; Icon: ComponentType<{ color: string; size?: number }> };

/**
 * A compact bottom sheet that picks one of a few views ("Calendar view": Day, Month, Agenda; "Roster view": List, Cards, Insights). It
 * replaces a full-width switcher row, so the page keeps that height. The dim and the sheet are animated by hand (the Modal itself has no
 * animation) so the backdrop fades instead of sliding up with the sheet; the Modal stays mounted until the close animation has finished.
 */
export function OptionSheet<K extends string>({
  visible,
  title,
  options,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SheetOption<K>[];
  value: K;
  onPick: (key: K) => void;
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
        <Animated.View onLayout={(e) => height.set(e.nativeEvent.layout.height)} style={[sheet, styles.limit]}>
          <Glass tint={withAlpha(palette.arena, 0.55)} style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} fallbackStyle={styles.sheetPlain}>
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            {options.map(({ key, label, hint, Icon }) => {
              const on = key === value;
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
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowText, on && { color: palette.chalk }]}>{label}</Text>
                    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
                  </View>
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
  // On an iPad or a Mac window the sheet keeps a sheet's width, not the window's.
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  dim: { backgroundColor: '#000000' },
  limit: { width: '100%', maxWidth: SHEET_MAX },
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
  rowText: { fontFamily: fonts.bodySemi, fontSize: 18, color: palette.muted },
  hint: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, marginTop: 1 },
  check: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.chalk },
});
