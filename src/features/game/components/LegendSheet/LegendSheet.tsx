import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Glass } from '@/components';
import { fonts, palette, ratingTone, surfaces, withAlpha } from '@/lib/theme';

const OPEN_MS = 280;
const CLOSE_MS = 200;

/** What each column of the box score stands for, in the order of the table. */
export const LEGEND: { abbr: string; text: string }[] = [
  { abbr: 'CR', text: 'Courtside Rating' },
  { abbr: 'MIN', text: 'Minutes played' },
  { abbr: 'PTS', text: 'Points' },
  { abbr: 'REB', text: 'Rebounds' },
  { abbr: 'AST', text: 'Assists' },
  { abbr: 'TO', text: 'Turnovers' },
  { abbr: 'STL', text: 'Steals' },
  { abbr: 'BLK', text: 'Blocks' },
  { abbr: '3PT', text: 'Three-pointers made and attempted' },
  { abbr: 'FG', text: 'Field goals made and attempted' },
  { abbr: 'FT', text: 'Free throws made and attempted' },
  { abbr: 'PF', text: 'Personal fouls' },
  { abbr: '+/-', text: 'Plus-minus' },
];

/** The rating's bands, as the squares show them. */
const BANDS = [
  { label: '< 6', rating: 5 },
  { label: '6-7', rating: 6.5 },
  { label: '7-8', rating: 7.5 },
  { label: '8-9', rating: 8.5 },
  { label: '9+', rating: 9.5 },
];

/**
 * "Box score legend" bottom sheet: what the column names mean, and the colors of the Courtside Rating. Animated by hand like the Calendar's
 * view sheet (the dim fades, the sheet slides, the Modal stays mounted until the close animation ends).
 */
export function LegendSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const progress = useSharedValue(0);
  const height = useSharedValue(600);
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
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View onLayout={(e) => height.set(e.nativeEvent.layout.height)} style={[sheet, styles.limit]}>
          <Glass tint={withAlpha(palette.arena, 0.55)} style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} fallbackStyle={styles.sheetPlain}>
            <View style={styles.head}>
              <Text style={styles.title}>Box score legend</Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {LEGEND.map((row) => (
                <View key={row.abbr} style={styles.row}>
                  <Text style={styles.abbr}>{row.abbr}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.text}>{row.text}</Text>
                    {row.abbr === 'CR' ? (
                      <>
                        <Text style={styles.note}>Worked out from the box score for the whole of a finished game, 1 to 10, for players with 5 minutes or more.</Text>
                        <View style={styles.bands}>
                          {BANDS.map((b) => {
                            const tone = ratingTone(b.rating);
                            return (
                              <View key={b.label} style={styles.band}>
                                <View style={[styles.swatch, { backgroundColor: tone.background }]} />
                                <Text style={styles.bandLabel}>{b.label}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </>
                    ) : null}
                  </View>
                </View>
              ))}
              <View style={styles.row}>
                <View style={[styles.abbrBox, { alignItems: 'flex-start' }]}>
                  <View style={styles.starterTag}>
                    <Text style={styles.starterText}>Starter</Text>
                  </View>
                </View>
                <Text style={[styles.text, { flex: 1 }]}>Started the game (the gold edge on the row)</Text>
              </View>
            </ScrollView>
          </Glass>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  dim: { backgroundColor: '#000000' },
  limit: { maxHeight: '86%' },
  sheetPlain: { backgroundColor: palette.arenaRaised },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 8, flexShrink: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 6 },
  title: { fontFamily: fonts.displayBold, fontSize: 22, color: palette.chalk },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: surfaces.raised },
  closeText: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.muted },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 11, paddingHorizontal: 6 },
  abbr: { width: 52, fontFamily: fonts.bodyBold, fontSize: 14, color: palette.muted },
  abbrBox: { width: 52 },
  text: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.chalk },
  note: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, marginTop: 4, lineHeight: 18 },
  bands: { flexDirection: 'row', gap: 12, marginTop: 10 },
  band: { alignItems: 'center', gap: 4 },
  swatch: { width: 26, height: 26 },
  bandLabel: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted },
  starterTag: { height: 14, paddingHorizontal: 6, borderRadius: 7, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  starterText: { fontFamily: fonts.bodyBold, fontSize: 9, color: palette.arena },
});
