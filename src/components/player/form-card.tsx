import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { GameLogEntry } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';

const WIN = '#34D399';
const LOSS = '#F87171';
const HOT = '#FB923C';
const COLD = '#60A5FA';
const BAR_AREA = 72;
/** Distance from the bottom of a column to the bottom of its bar: opponent label, result strip and two gaps. */
const BAR_BASE = 12 + 3 + 3 + 3;

const avg = (games: GameLogEntry[], pick: (g: GameLogEntry) => number) =>
  games.length === 0 ? 0 : games.reduce((sum, g) => sum + pick(g), 0) / games.length;

type Form = { label: 'HOT' | 'COLD' | 'STEADY'; color: string };

/** Last five games against the whole season: a big enough swing is "hot" or "cold". */
function formOf(last5: number, season: number, sample: number): Form {
  if (sample < 3 || season === 0) return { label: 'STEADY', color: palette.muted };
  const diff = last5 - season;
  if (diff >= Math.max(3, season * 0.2)) return { label: 'HOT', color: HOT };
  if (diff <= -Math.max(3, season * 0.2)) return { label: 'COLD', color: COLD };
  return { label: 'STEADY', color: palette.muted };
}

/** A points chart for the last ten games, a hot/cold read, and last-5 / last-10 / season averages. */
export function FormCard({ log, accent }: { log: GameLogEntry[]; accent: string }) {
  // The feed is newest first; charts read left to right.
  const recent = log.slice(0, 10).reverse();
  if (recent.length < 2) return null;

  const season = avg(log, (g) => g.pts);
  const last5 = log.slice(0, 5);
  const last10 = log.slice(0, 10);
  // A "hot" or "cold" call needs a real sample: the last 5 against at least 3 more games.
  const form = log.length >= 8 ? formOf(avg(last5, (g) => g.pts), season, last5.length) : null;
  const showL10 = log.length > 10; // otherwise L10 would just repeat the season column
  const showL5 = log.length > 5;
  const maxPts = Math.max(...recent.map((g) => g.pts), Math.ceil(season), 1);
  const seasonY = (season / maxPts) * BAR_AREA;

  const rows: { key: string; pick: (g: GameLogEntry) => number }[] = [
    { key: 'PTS', pick: (g) => g.pts },
    { key: 'REB', pick: (g) => g.reb },
    { key: 'AST', pick: (g) => g.ast },
    { key: 'MIN', pick: (g) => g.min },
  ];

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Points · last {recent.length} games</Text>
        {form && form.label !== 'STEADY' ? (
          <View style={[styles.badge, { backgroundColor: withAlpha(form.color, 0.16) }]}>
            <Text style={[styles.badgeText, { color: form.color }]}>{form.label}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <View
          style={styles.chart}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Points in the last ${recent.length} games, oldest first: ${recent.map((g) => g.pts).join(', ')}. Season average ${season.toFixed(1)}.`}>
          <View style={[styles.avgLine, { bottom: BAR_BASE + seasonY }]}>
            <View style={styles.avgDash} />
            <Text style={styles.avgLabel}>{season.toFixed(1)} avg</Text>
          </View>
          {recent.map((g, i) => (
            <View key={g.gameId} style={styles.col}>
              <Text style={styles.barValue}>{g.pts}</Text>
              <Animated.View
                entering={FadeInDown.delay(i * 30).duration(280)}
                style={[
                  styles.bar,
                  {
                    height: Math.max(3, (g.pts / maxPts) * BAR_AREA),
                    backgroundColor: g.pts >= season ? accent : withAlpha(accent, 0.38),
                  },
                ]}
              />
              <View style={[styles.result, { backgroundColor: g.result === 'W' ? WIN : g.result === 'L' ? LOSS : palette.muted }]} />
              <Text style={styles.opp}>{g.home ? '' : '@'}{g.opponent}</Text>
            </View>
          ))}
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.cellHead, styles.cellLabel]} />
            {showL5 && <Text style={styles.cellHead}>L5</Text>}
            {showL10 && <Text style={styles.cellHead}>L10</Text>}
            <Text style={styles.cellHead}>Season</Text>
          </View>
          {rows.map((r) => {
            const l5 = avg(last5, r.pick);
            const l10 = avg(last10, r.pick);
            const s = avg(log, r.pick);
            const delta = l5 - s;
            return (
              <View key={r.key} style={styles.tableRow}>
                <Text style={[styles.cell, styles.cellLabel, styles.rowKey]}>{r.key}</Text>
                {showL5 && (
                  <Text style={[styles.cell, styles.strong]}>
                    {l5.toFixed(1)}
                    <Text style={{ color: delta >= 0.5 ? WIN : delta <= -0.5 ? LOSS : palette.muted, fontSize: 11 }}>
                      {Math.abs(delta) >= 0.5 ? (delta > 0 ? ' ▲' : ' ▼') : ''}
                    </Text>
                  </Text>
                )}
                {showL10 && <Text style={styles.cell}>{l10.toFixed(1)}</Text>}
                <Text style={[styles.cell, !showL5 && styles.strong]}>{s.toFixed(1)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

type Split = { label: string; games: GameLogEntry[] };

/** Averages when playing at home vs away, and in wins vs losses. */
export function SplitsCard({ log }: { log: GameLogEntry[] }) {
  const splits: Split[] = [
    { label: 'Home', games: log.filter((g) => g.home) },
    { label: 'Away', games: log.filter((g) => !g.home) },
    { label: 'In wins', games: log.filter((g) => g.result === 'W') },
    { label: 'In losses', games: log.filter((g) => g.result === 'L') },
  ].filter((s) => s.games.length > 0);
  if (log.length < 4 || splits.length < 2) return null;

  return (
    <Animated.View entering={FadeInDown.delay(110).duration(300)} style={styles.wrap}>
      <Text style={[styles.title, { marginBottom: 8 }]}>Splits</Text>
      <View style={styles.card}>
        <View style={styles.tableRow}>
          <Text style={[styles.cellHead, styles.splitLabel]} />
          <Text style={styles.cellHead}>GP</Text>
          <Text style={styles.cellHead}>PTS</Text>
          <Text style={styles.cellHead}>REB</Text>
          <Text style={styles.cellHead}>AST</Text>
        </View>
        {splits.map((s) => (
          <View key={s.label} style={styles.tableRow}>
            <Text style={[styles.cell, styles.splitLabel, styles.rowKey]}>{s.label}</Text>
            <Text style={styles.cell}>{s.games.length}</Text>
            <Text style={[styles.cell, styles.strong]}>{avg(s.games, (g) => g.pts).toFixed(1)}</Text>
            <Text style={styles.cell}>{avg(s.games, (g) => g.reb).toFixed(1)}</Text>
            <Text style={styles.cell}>{avg(s.games, (g) => g.ast).toFixed(1)}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: palette.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6 },
  card: { borderRadius: 18, backgroundColor: withAlpha('#FFFFFF', 0.06), padding: 14, gap: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: BAR_AREA + 28 + 16 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  barValue: { fontFamily: fonts.bodySemi, fontSize: 10, color: palette.muted },
  bar: { width: 14, borderRadius: 4 },
  result: { width: 14, height: 3, borderRadius: 2 },
  opp: { fontFamily: fonts.body, fontSize: 9, color: palette.muted, height: 12 },
  avgLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  avgDash: { flex: 1, height: 1, backgroundColor: withAlpha(palette.chalk, 0.35) },
  avgLabel: { fontFamily: fonts.bodySemi, fontSize: 10, color: palette.muted, marginLeft: 6 },
  table: { gap: 6 },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  cellHead: { flex: 1, textAlign: 'right', fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.4 },
  cell: { flex: 1, textAlign: 'right', fontFamily: fonts.bodySemi, fontSize: 14, color: withAlpha(palette.chalk, 0.8) },
  cellLabel: { flex: 0, width: 44, textAlign: 'left' },
  splitLabel: { flex: 0, width: 84, textAlign: 'left' },
  rowKey: { color: palette.muted, fontFamily: fonts.bodySemi },
  strong: { color: palette.chalk, fontFamily: fonts.bodyBold },
});
