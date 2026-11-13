import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, SectionLabel } from '@/components';
import type { SeriesPerformance } from '@/lib/league';
import { fonts, fontSize, palette, space, surfaces, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';

/**
 * The best single-game lines of the series, best first: who, for which team, how many points, rebounds and assists, and in which game. A tap
 * opens that game (the series page stays under it, so back comes back here).
 */
export function SeriesPerformances({ lines, labelOf, abbrOf }: { lines: SeriesPerformance[]; labelOf: (gameId: string) => string; abbrOf: (teamId: string) => string }) {
  if (lines.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <SectionLabel style={styles.label}>Best performances</SectionLabel>
      <Card padded={false}>
        {lines.map((l, i) => (
          <Pressable
            key={`${l.gameId}-${l.athleteId}`}
            onPress={() => openDetail({ pathname: '/game/[id]', params: { id: l.gameId } })}
            accessibilityRole="button"
            accessibilityLabel={`${l.name}, ${l.pts} points, ${l.reb} rebounds, ${l.ast} assists, ${labelOf(l.gameId)}`}
            style={({ pressed }) => [styles.row, i > 0 && styles.border, pressed && { backgroundColor: surfaces.raised }]}>
            <View style={styles.photo}>{l.headshot ? <Image source={l.headshot} style={styles.headshot} contentFit="cover" contentPosition="top" /> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{l.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>{abbrOf(l.teamId)} · {labelOf(l.gameId)}</Text>
            </View>
            <View style={styles.line}>
              <Stat value={l.pts} label="PTS" strong />
              <Stat value={l.reb} label="REB" />
              <Stat value={l.ast} label="AST" />
            </View>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

function Stat({ value, label, strong }: { value: number; label: string; strong?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.value, strong && { color: palette.chalk }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, marginBottom: space.lg },
  label: { marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  photo: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: surfaces.raised },
  headshot: { width: 48, height: 48 },
  name: { fontFamily: fonts.bodyBold, fontSize: fontSize.large, color: palette.chalk },
  meta: { fontFamily: fonts.body, fontSize: fontSize.label, color: palette.muted },
  line: { flexDirection: 'row', gap: space.md },
  stat: { alignItems: 'center', minWidth: 30 },
  value: { fontFamily: fonts.display, fontSize: fontSize.title, color: withAlpha(palette.chalk, 0.8) },
  statLabel: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 0.5, color: palette.muted },
});
