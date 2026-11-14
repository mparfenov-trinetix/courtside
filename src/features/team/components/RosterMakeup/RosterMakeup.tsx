import { StyleSheet, Text, View } from 'react-native';

import { Card, SectionLabel } from '@/components';
import type { Player } from '@/lib/espn';
import { formatCategory, lastNameOf, rosterMakeup, type RosterMakeup as Makeup } from '@/lib/league';
import { fonts, palette, withAlpha, type TeamTheme } from '@/lib/theme';

const POSITIONS = [
  { key: 'G', label: 'Guards' },
  { key: 'F', label: 'Forwards' },
  { key: 'C', label: 'Centers' },
] as const;

/** How the roster is built: how old, how tall, how experienced, which positions, how international. */
export function RosterMakeup({ players, theme }: { players: Player[]; theme: TeamTheme }) {
  const m = rosterMakeup(players);
  if (m.count === 0) return null;
  const named = (p?: Player, extra?: string) => (p ? `${lastNameOf(p.name)}${extra ? ` ${extra}` : ''}` : '–');
  const tiles: { label: string; value: string; sub: string }[] = [
    {
      label: 'Average age',
      value: m.avgAge != null ? m.avgAge.toFixed(1) : '–',
      sub: `${named(m.youngest, m.youngest?.age != null ? `(${m.youngest.age})` : '')} youngest · ${named(m.oldest, m.oldest?.age != null ? `(${m.oldest.age})` : '')} oldest`,
    },
    {
      label: 'Average height',
      value: m.avgHeightCm != null ? formatCategory('height', m.avgHeightCm) : '–',
      sub: m.tallest ? `${lastNameOf(m.tallest.name)} tallest, ${m.tallest.height ?? ''}` : ' ',
    },
    {
      label: 'Experience',
      value: m.avgExperience != null ? `${m.avgExperience.toFixed(1)} yrs` : '–',
      sub: `${m.rookies} rookie${m.rookies === 1 ? '' : 's'} · ${m.veterans} with 10+ seasons`,
    },
    {
      label: 'International',
      value: String(m.international),
      sub: m.international === 0 ? 'All born in the U.S.' : `from ${m.countries} countr${m.countries === 1 ? 'y' : 'ies'}`,
    },
  ];

  return (
    <View>
      <SectionLabel style={styles.label}>The roster</SectionLabel>
      <Card style={styles.card}>
        <View style={styles.grid}>
          {tiles.map((t) => (
            <View key={t.label} style={styles.tile}>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={[styles.tileValue, { color: theme.accent }]}>{t.value}</Text>
              <Text style={styles.tileSub} numberOfLines={2}>
                {t.sub}
              </Text>
            </View>
          ))}
        </View>
        <Positions m={m} theme={theme} />
      </Card>
    </View>
  );
}

function Positions({ m, theme }: { m: Makeup; theme: TeamTheme }) {
  const total = POSITIONS.reduce((n, p) => n + m.positions[p.key], 0);
  if (total === 0) return null;
  return (
    <View style={styles.positions}>
      <Text style={styles.tileLabel}>Positions</Text>
      <View style={styles.bar}>
        {POSITIONS.map((p, i) => (
          <View key={p.key} style={{ flex: Math.max(m.positions[p.key], 0.001), backgroundColor: withAlpha(theme.brand, [1, 0.65, 0.35][i]!) }} />
        ))}
      </View>
      <View style={styles.legend}>
        {POSITIONS.map((p) => (
          <Text key={p.key} style={styles.legendText}>
            {m.positions[p.key]} {p.label.toLowerCase()}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, paddingHorizontal: 4 },
  card: { gap: 14, padding: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  tile: { width: '50%', gap: 2, paddingRight: 8 },
  tileLabel: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: palette.muted },
  tileValue: { fontFamily: fonts.display, fontSize: 30, lineHeight: 32 },
  tileSub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  positions: { gap: 6 },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.chalk },
});
