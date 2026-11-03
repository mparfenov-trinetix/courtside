import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { CareerRow, PlayerCareer } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';

const COLS = ['GP', 'GS', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', 'PF', 'FG%', '3P%', 'FT%', 'FG', '3PT', 'FT'];

const COL_W: Record<string, number> = {
  GP: 36, GS: 36, MIN: 42, PTS: 46, REB: 42, AST: 40, STL: 40, BLK: 40, TO: 38, PF: 34,
  'FG%': 48, '3P%': 48, 'FT%': 48, FG: 68, '3PT': 62, FT: 66, OR: 40, DR: 40,
};
const FIRST_W = 112;
/** Columns where the best season gets highlighted. */
const HIGHLIGHT = new Set(['PTS', 'REB', 'AST', 'STL', 'BLK']);

type SortDir = 'asc' | 'desc';

const num = (v?: string) => {
  const n = parseFloat((v ?? '').split('-')[0]);
  return isNaN(n) ? -Infinity : n;
};

/** Season-by-season table for a player, built like the box score table on the game screen. */
export function CareerTable({ career, accent }: { career: PlayerCareer; accent: string }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const rows = career.seasons;
  const careerLine = career.career;
  const cols = COLS.filter((c) => rows.some((r) => r.stats[c] != null && r.stats[c] !== '') || careerLine[c]);

  // Traded seasons carry a combined "TOT" row; it's the one that counts for highlights.
  const seasonKeys = new Set(rows.filter((r) => r.abbr === 'TOT').map((r) => r.year));
  const countable = rows.filter((r) => r.abbr === 'TOT' || !seasonKeys.has(r.year));
  const best: Record<string, number> = {};
  for (const col of HIGHLIGHT) best[col] = Math.max(...countable.map((r) => num(r.stats[col])));

  const sorted = sortCol
    ? [...rows].sort((a, b) => (sortDir === 'desc' ? 1 : -1) * (num(b.stats[sortCol]) - num(a.stats[sortCol])))
    : rows;

  const handleSort = (col: string) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortDir('asc');
    } else {
      setSortCol(null);
    }
  };

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No career stats</Text>
        <Text style={styles.emptyText}>This player hasn&apos;t logged NBA minutes yet.</Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(300)}>
      <Text style={styles.note}>Regular season, per game · tap a column to sort</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tableScroll}
        contentContainerStyle={styles.tableContent}>
        <View>
          <View style={styles.row}>
            <View style={[styles.first, { justifyContent: 'flex-start' }]}>
              <Text style={styles.firstHeader}>SEASON</Text>
            </View>
            {cols.map((col) => {
              const active = sortCol === col;
              return (
                <Pressable key={col} onPress={() => handleSort(col)} style={{ width: COL_W[col], alignItems: 'flex-end' }}>
                  <Text style={[styles.colHeader, active && styles.colHeaderActive]}>
                    {col}{active ? (sortDir === 'desc' ? ' ▾' : ' ▴') : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {sorted.map((row, i) => (
            <CareerLine key={`${row.season}-${row.abbr}-${i}`} row={row} cols={cols} shade={i % 2 === 1} accent={accent} best={best} />
          ))}

          <View style={[styles.row, styles.careerRow]}>
            <View style={styles.first}>
              <Text style={styles.careerLabel}>CAREER</Text>
            </View>
            {cols.map((col) => (
              <Text key={col} style={[styles.cell, styles.careerValue, { width: COL_W[col] }]}>
                {careerLine[col] || '–'}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

function CareerLine({
  row,
  cols,
  shade,
  accent,
  best,
}: {
  row: CareerRow;
  cols: string[];
  shade: boolean;
  accent: string;
  best: Record<string, number>;
}) {
  const isTot = row.abbr === 'TOT';
  return (
    <View style={[styles.row, shade && styles.shade]}>
      <View style={styles.first}>
        {row.logo && !isTot ? <Image source={row.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.logo} />}
        <View>
          <Text style={styles.season}>{row.season}</Text>
          <Text style={styles.team}>{isTot ? 'Combined' : row.abbr}</Text>
        </View>
      </View>
      {cols.map((col) => {
        const isBest = HIGHLIGHT.has(col) && num(row.stats[col]) === best[col] && best[col] > -Infinity;
        return (
          <Text
            key={col}
            style={[styles.cell, { width: COL_W[col] }, isBest && { color: accent, fontFamily: fonts.bodyBold }]}>
            {row.stats[col] || '–'}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // The page pads its content by 16; cancel that so the table scrolls edge to edge.
  tableScroll: { marginHorizontal: -16 },
  tableContent: { paddingHorizontal: 16 },
  note: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginBottom: 8, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingRight: 16, borderRadius: 8 },
  shade: { backgroundColor: withAlpha('#FFFFFF', 0.03) },
  first: { width: FIRST_W, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 6 },
  firstHeader: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: withAlpha(palette.chalk, 0.8),
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  colHeader: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.4 },
  colHeaderActive: { color: palette.chalk, fontFamily: fonts.bodyBold },
  logo: { width: 24, height: 24 },
  season: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  team: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginTop: 1 },
  cell: { textAlign: 'right', fontFamily: fonts.bodySemi, fontSize: 13, color: withAlpha(palette.chalk, 0.78) },
  careerRow: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: withAlpha(palette.chalk, 0.12),
  },
  careerLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.muted, paddingLeft: 4 },
  careerValue: { fontFamily: fonts.bodyBold, color: palette.chalk },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 28, color: palette.chalk },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: palette.muted, textAlign: 'center' },
});
