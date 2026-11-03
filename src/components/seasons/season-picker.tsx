import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronIcon } from '@/components/icons';
import { currentSeason, seasonLabel } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';

/** How many seasons back the picker offers. */
const HISTORY = 6;

export const availableSeasons = (): number[] => {
  const now = currentSeason();
  return Array.from({ length: HISTORY + 1 }, (_, i) => now - i);
};

/** A small "2026-27 ▾" button. */
export function SeasonButton({ season, onPress }: { season: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`Season ${seasonLabel(season)}. Change season`}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}>
      <Text style={styles.buttonText}>{seasonLabel(season)}</Text>
      <View style={{ transform: [{ rotate: '90deg' }] }}>
        <ChevronIcon color={palette.chalk} size={14} />
      </View>
    </Pressable>
  );
}

/** Bottom sheet listing the current season and the last few. */
export function SeasonSheet({
  visible,
  season,
  onPick,
  onClose,
}: {
  visible: boolean;
  season: number;
  onPick: (year: number) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const now = currentSeason();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.head}>
          <Text style={styles.title}>Season</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        {availableSeasons().map((year) => {
          const on = year === season;
          return (
            <Pressable
              key={year}
              onPress={() => {
                onPick(year);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.7 }]}>
              <Text style={[styles.rowText, on && { color: palette.chalk }]}>{seasonLabel(year)}</Text>
              {year === now ? <Text style={styles.tag}>CURRENT</Text> : null}
              {on ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: withAlpha('#FFFFFF', 0.08) },
  buttonText: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
  sheet: { flex: 1, backgroundColor: palette.arena, paddingHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  title: { fontFamily: fonts.display, fontSize: 30, color: palette.chalk },
  done: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, marginBottom: 8, borderRadius: 14, backgroundColor: withAlpha('#FFFFFF', 0.05) },
  rowOn: { backgroundColor: withAlpha('#FFFFFF', 0.12) },
  rowText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 18, color: palette.muted },
  tag: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.6, color: '#34D399' },
  check: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.chalk },
});
