import { StyleSheet, Text, View } from 'react-native';

import { Card, Pill } from '@/components';
import type { PickSummary } from '@/lib/league';
import { fonts, fontSize, palette, space, withAlpha } from '@/lib/theme';

const pct = (n: number | null) => (n == null ? '–' : `${Math.round(n * 100)}%`);

/**
 * The score card of your picks: the record, how often you were right, the run you are on, and how that compares to backing the
 * favorite every time (the number to beat). Dashes, not zeros, before the first result.
 */
export function PickRecord({ summary }: { summary: PickSummary }) {
  const { won, lost, pending, accuracy, streak, bestStreak, versus, upsets } = summary;
  const decided = won + lost;
  const ahead = versus.you - versus.favorite;
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Cell value={decided ? `${won}–${lost}` : '–'} label="Record" />
        <Cell value={pct(accuracy)} label="Right" />
        <Cell value={streak ? `${streak.kind}${streak.length}` : '–'} label="Streak" tone={streak?.kind === 'W' ? palette.win : streak?.kind === 'L' ? palette.loss : undefined} />
      </View>
      {versus.games >= 3 ? (
        <View style={styles.versus}>
          <Text style={styles.versusText}>
            Always picking the favorite would be {versus.favorite} of {versus.games}; you are {versus.you} of {versus.games}.
          </Text>
          <Pill tone={ahead > 0 ? 'win' : ahead < 0 ? 'loss' : 'muted'}>{ahead > 0 ? `+${ahead} on the favorite` : ahead < 0 ? `${ahead} on the favorite` : 'Level with the favorite'}</Pill>
        </View>
      ) : null}
      <View style={styles.foot}>
        <Text style={styles.footText}>Best run {bestStreak}</Text>
        <Text style={styles.footText}>Upsets called {upsets}</Text>
        <Text style={styles.footText}>{pending} waiting</Text>
      </View>
    </Card>
  );
}

function Cell({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.value, tone ? { color: tone } : null]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center' },
  value: { fontFamily: fonts.display, fontSize: fontSize.hero, lineHeight: 52, color: palette.chalk },
  label: { fontFamily: fonts.bodySemi, fontSize: fontSize.caption, letterSpacing: 1, textTransform: 'uppercase', color: palette.muted },
  versus: { alignItems: 'center', gap: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  versusText: { fontFamily: fonts.body, fontSize: fontSize.small, color: withAlpha(palette.chalk, 0.8), textAlign: 'center' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  footText: { fontFamily: fonts.bodySemi, fontSize: fontSize.caption, color: palette.muted },
});
