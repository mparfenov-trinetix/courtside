import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassButton } from '../Glass';
import { ChevronIcon } from '../Icons';
import { currentSeason, seasonLabel } from '@/lib/espn';
import { fonts, palette, withAlpha, surfaces } from '@/lib/theme';

/** The 2000-01 season: as far back as ESPN's standings are reliable. */
export const FIRST_SEASON = 2001;

/** Seasons the picker offers, newest first, down to `from` (a season is named by the year it ends in). */
export const availableSeasons = (from: number = FIRST_SEASON): number[] => {
  const now = currentSeason();
  return Array.from({ length: Math.max(now - from + 1, 1) }, (_, i) => now - i);
};

/**
 * A small "2026-27 ▾" button. `label` writes the year another way ("2026" for a screen that goes by calendar years, the All-Star Game and the
 * Draft) and `noun` is what the button changes, for the screen reader.
 */
export function SeasonButton({
  season,
  onPress,
  label = seasonLabel,
  noun = 'season',
}: {
  season: number;
  onPress: () => void;
  label?: (year: number) => string;
  noun?: string;
}) {
  return (
    <GlassButton wide size={40} hitSlop={10} onPress={onPress} label={`${label(season)}. Change ${noun}`}>
      <Text style={styles.buttonText}>{label(season)}</Text>
      <View style={{ transform: [{ rotate: '90deg' }] }}>
        <ChevronIcon color={palette.chalk} size={14} />
      </View>
    </GlassButton>
  );
}

/**
 * Bottom sheet listing the current season and the last few. A screen whose years are not simply "every season down to `from`" (the Draft has
 * no class for a season that has not ended, the All-Star Game none for 2000-01) passes its own list in `seasons`, and `label` / `title` for
 * one that goes by calendar years.
 */
export function SeasonSheet({
  visible,
  season,
  onPick,
  onClose,
  from = FIRST_SEASON,
  seasons,
  label = seasonLabel,
  title = 'Season',
}: {
  visible: boolean;
  season: number;
  onPick: (year: number) => void;
  onClose: () => void;
  /** Oldest season to offer, for screens whose data doesn't go back as far. */
  from?: number;
  /** The years to offer, newest first, instead of every season down to `from`. */
  seasons?: number[];
  label?: (year: number) => string;
  title?: string;
}) {
  const insets = useSafeAreaInsets();
  const now = currentSeason();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        {/* The list runs to the bottom edge and pads its own end, so rows scroll under the home indicator instead of being cut off. */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        {(seasons ?? availableSeasons(from)).map((year) => {
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
              <Text style={[styles.rowText, on && { color: palette.chalk }]}>{label(year)}</Text>
              {year === now ? <Text style={styles.tag}>CURRENT</Text> : null}
              {on ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  buttonText: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
  sheet: { flex: 1, backgroundColor: palette.arena, paddingHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  title: { fontFamily: fonts.display, fontSize: 30, color: palette.chalk },
  done: { fontFamily: fonts.bodySemi, fontSize: 16, color: palette.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, marginBottom: 8, borderRadius: 14, backgroundColor: surfaces.card },
  rowOn: { backgroundColor: withAlpha('#FFFFFF', 0.12) },
  rowText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 18, color: palette.muted },
  tag: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.6, color: palette.win },
  check: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.chalk },
});
