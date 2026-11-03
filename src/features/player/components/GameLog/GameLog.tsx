import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';

import type { GameLogEntry } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { STATS, CHART_H, BAR_GAP, SHOWN } from './constants';
type StatKey = (typeof STATS)[number]['key'];

export function GameLog({ entries, accent }: { entries: GameLogEntry[]; accent: string }) {
  const [stat, setStat] = useState<StatKey>('pts');
  const [width, setWidth] = useState(0);

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No games yet</Text>
        <Text style={styles.emptyText}>The game log fills in once the season is underway.</Text>
      </View>
    );
  }

  const recent = entries.slice(0, SHOWN).reverse(); // oldest → newest, left → right
  const values = recent.map((e) => e[stat]);
  const max = Math.max(...values, 1);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const barW = width > 0 ? (width - BAR_GAP * (recent.length - 1)) / recent.length : 0;
  const avgY = CHART_H - (avg / max) * (CHART_H - 18);

  return (
    <View style={styles.wrap}>
      <View style={styles.chartHeader}>
        <Text style={styles.sectionLabel}>Last {recent.length} games</Text>
        <View style={styles.chips}>
          {STATS.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => setStat(s.key)}
              style={[styles.chip, stat === s.key && { backgroundColor: withAlpha(accent, 0.22), borderColor: withAlpha(accent, 0.6) }]}>
              <Text style={[styles.chipLabel, stat === s.key && { color: palette.chalk }]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.chart} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <>
            <Svg width={width} height={CHART_H}>
              {recent.map((e, i) => {
                const h = Math.max(3, (e[stat] / max) * (CHART_H - 18));
                const win = e.result !== 'L';
                return (
                  <Rect
                    key={e.gameId}
                    x={i * (barW + BAR_GAP)}
                    y={CHART_H - h}
                    width={barW}
                    height={h}
                    rx={4}
                    fill={win ? accent : withAlpha(palette.chalk, 0.28)}
                  />
                );
              })}
              <Line x1={0} y1={avgY} x2={width} y2={avgY} stroke={withAlpha(palette.chalk, 0.55)} strokeDasharray="4,4" strokeWidth={1} />
            </Svg>
            {recent.map((e, i) => (
              <Text
                key={e.gameId}
                style={[styles.barValue, { left: i * (barW + BAR_GAP), width: barW, bottom: Math.max(3, (e[stat] / max) * (CHART_H - 18)) + 3 }]}>
                {e[stat]}
              </Text>
            ))}
          </>
        )}
      </View>
      <Text style={styles.avgNote}>
        Avg {avg.toFixed(1)} · <Text style={{ color: accent }}>wins</Text> / <Text style={{ color: withAlpha(palette.chalk, 0.5) }}>losses</Text>
      </Text>

      <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Game log</Text>
      <View style={styles.list}>
        {entries.slice(0, 20).map((e, i) => (
          <Animated.View key={e.gameId} entering={i < 10 ? FadeInDown.delay(i * 25).duration(240) : undefined}>
            <Pressable
              onPress={() => openDetail({ pathname: '/game/[id]', params: { id: e.gameId } })}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && { opacity: 0.7 }]}>
              <View style={styles.rowLeft}>
                <Text style={styles.date}>
                  {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
                <View style={styles.opp}>
                  {e.opponentLogo ? <Image source={e.opponentLogo} style={styles.oppLogo} contentFit="contain" /> : null}
                  <Text style={styles.oppText}>{e.home ? 'vs' : '@'} {e.opponent}</Text>
                  {e.playoffs ? <Text style={styles.poTag}>PO</Text> : null}
                </View>
                <Text style={[styles.result, { color: e.result === 'W' ? '#34D399' : '#F87171' }]}>
                  {e.result ?? ''} {e.teamScore}–{e.opponentScore}
                </Text>
              </View>
              <View style={styles.line}>
                <Cell value={e.pts} label="PTS" strong />
                <Cell value={e.reb} label="REB" />
                <Cell value={e.ast} label="AST" />
                <Cell value={e.min} label="MIN" />
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function Cell({ value, label, strong }: { value: number; label: string; strong?: boolean }) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.cellValue, strong && { color: palette.chalk, fontFamily: fonts.display }]}>{value}</Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  sectionLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: palette.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: withAlpha(palette.chalk, 0.06),
  },
  chipLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  chart: { height: CHART_H },
  barValue: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: withAlpha(palette.chalk, 0.85),
  },
  avgNote: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, marginTop: 8 },
  list: { marginTop: 8, borderRadius: 18, backgroundColor: withAlpha('#FFFFFF', 0.06), overflow: 'hidden' },
  row: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.1) },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  date: { width: 46, fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
  opp: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  oppLogo: { width: 20, height: 20 },
  poTag: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: palette.maple,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: withAlpha(palette.maple, 0.16),
  },
  oppText: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
  result: { fontFamily: fonts.bodyBold, fontSize: 13 },
  line: { flexDirection: 'row', paddingLeft: 56 },
  cell: { flex: 1, alignItems: 'flex-start' },
  cellValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: withAlpha(palette.chalk, 0.85) },
  cellLabel: { fontFamily: fonts.body, fontSize: 10, color: palette.muted, letterSpacing: 0.4 },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 28, color: palette.chalk },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: palette.muted, textAlign: 'center' },
});
