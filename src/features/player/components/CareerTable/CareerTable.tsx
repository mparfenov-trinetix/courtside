import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { currentSeason, seasonLabel, type CareerRow, type PlayerCareer } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { COLS, COL_W, FIRST_W, ROW_H, HEADER_H, CAREER_H, HIGHLIGHT } from './constants';

type SortDir = 'asc' | 'desc';

const num = (v?: string) => {
  const n = parseFloat((v ?? '').split('-')[0]);
  return isNaN(n) ? -Infinity : n;
};

/** One list in the order it should read: the newest season first and history below it; for a traded season, the first team, then the combined line, then the rest. */
function arrange(rows: CareerRow[]): CareerRow[] {
  const seasons: string[] = [];
  for (const r of rows) if (!seasons.includes(r.season)) seasons.push(r.season);
  seasons.sort().reverse();
  return seasons.flatMap((season) => {
    const group = rows.filter((r) => r.season === season);
    const tot = group.find((r) => r.abbr === 'TOT');
    const teams = group.filter((r) => r.abbr !== 'TOT');
    return tot && teams.length > 1 ? [teams[0], tot, ...teams.slice(1)] : group;
  });
}

/**
 * Season-by-season table for a player. Like the box score, the season/team column stays pinned on the left
 * while the stat columns scroll sideways under a soft edge.
 */
export function CareerTable({ career, accent, background = palette.arena }: { career: PlayerCareer; accent: string; background?: string }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });
  const edge = useAnimatedStyle(() => ({ opacity: interpolate(scrollX.get(), [0, 14], [0, 1], Extrapolation.CLAMP) }));

  const rows = arrange(career.seasons);
  // This season's rows (a traded player has several) are washed in the accent color and tagged, so "how is he doing now" is the first thing the table says.
  const now = seasonLabel(currentSeason());
  const wash = withAlpha(accent, 0.14);
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
  const teamsOf = (row: CareerRow) => (row.abbr === 'TOT' ? rows.filter((r) => r.season === row.season && r.abbr !== 'TOT') : []);

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
    <Animated.View>
      <Text style={styles.note}>Regular season, per game · tap a column to sort</Text>

      <View style={styles.table}>
        {/* Pinned: season and team */}
        <View style={[styles.pinned, { backgroundColor: background }]}>
          <View style={[styles.firstCell, { height: HEADER_H }]}>
            <Text style={styles.firstHeader}>SEASON</Text>
          </View>
          {sorted.map((row, i) => (
            <SeasonCell key={`${row.season}-${row.abbr}-${i}`} row={row} teams={teamsOf(row)} shade={i % 2 === 1} current={row.season === now} accent={accent} wash={wash} />
          ))}
          <View style={[styles.firstCell, styles.careerBorder, { height: CAREER_H }]}>
            <Text style={styles.careerLabel}>CAREER</Text>
          </View>
          <Animated.View pointerEvents="none" style={[styles.edge, edge]}>
            <LinearGradient colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>

        {/* Scrolls sideways: the stats */}
        <Animated.ScrollView
          horizontal
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.stats}>
          <View>
            <View style={[styles.statsRow, { height: HEADER_H }]}>
              {cols.map((col) => {
                const active = sortCol === col;
                return (
                  <Pressable key={col} onPress={() => handleSort(col)} hitSlop={{ top: 6, bottom: 6 }} style={{ width: COL_W[col], alignItems: 'flex-end' }}>
                    <Text style={[styles.colHeader, active && styles.colHeaderActive]}>
                      {col}
                      {active ? (sortDir === 'desc' ? ' ▾' : ' ▴') : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {sorted.map((row, i) => (
              <View key={`${row.season}-${row.abbr}-${i}`} style={[styles.statsRow, { height: ROW_H }, i % 2 === 1 && styles.shade, row.season === now && { backgroundColor: wash }]}>
                {cols.map((col) => {
                  const isBest = HIGHLIGHT.has(col) && num(row.stats[col]) === best[col] && best[col] > -Infinity;
                  return (
                    <Text key={col} style={[styles.cell, { width: COL_W[col] }, isBest && { color: accent, fontFamily: fonts.bodyBold }]}>
                      {row.stats[col] || '–'}
                    </Text>
                  );
                })}
              </View>
            ))}
            <View style={[styles.statsRow, styles.careerBorder, { height: CAREER_H }]}>
              {cols.map((col) => (
                <Text key={col} style={[styles.cell, styles.careerValue, { width: COL_W[col] }]}>
                  {careerLine[col] || '–'}
                </Text>
              ))}
            </View>
          </View>
        </Animated.ScrollView>
      </View>
    </Animated.View>
  );
}

/** The pinned half of a row: logo (or both logos for a traded season's combined line) and the season. */
function SeasonCell({ row, teams, shade, current, accent, wash }: { row: CareerRow; teams: CareerRow[]; shade: boolean; current: boolean; accent: string; wash: string }) {
  const isTot = row.abbr === 'TOT';
  return (
    <View style={[styles.firstCell, { height: ROW_H }, shade && styles.shade, current && { backgroundColor: wash }]}>
      {isTot && teams.length > 1 ? (
        <View style={styles.pair}>
          {teams.slice(0, 3).map((t, k) => (
            <View key={`${t.abbr}-${k}`} style={[styles.pairLogo, k > 0 && { marginLeft: -8 }]}>
              {t.logo ? <Image source={t.logo} style={styles.pairImg} contentFit="contain" /> : null}
            </View>
          ))}
        </View>
      ) : row.logo && !isTot ? (
        <Image source={row.logo} style={styles.logo} contentFit="contain" />
      ) : (
        <View style={styles.logo} />
      )}
      <View>
        <Text style={styles.season}>
          {row.season}
          {current ? <Text style={[styles.now, { color: accent }]}>{'  NOW'}</Text> : null}
        </Text>
        <Text style={styles.team}>{isTot ? (teams.length > 1 ? teams.map((t) => t.abbr).join(' · ') : 'Combined') : row.abbr}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginBottom: 8, marginTop: 2 },
  // The page pads its content by 16; cancel that so the table runs edge to edge.
  table: { flexDirection: 'row', marginHorizontal: -16 },
  pinned: { width: FIRST_W, zIndex: 2 },
  edge: { position: 'absolute', top: 0, bottom: 0, right: -8, width: 8 },
  stats: { flex: 1 },
  // Trailing padding lives in the rows, so the zebra shading runs to the screen edge.
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  firstCell: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 6 },
  shade: { backgroundColor: withAlpha('#FFFFFF', 0.04) },
  firstHeader: { fontFamily: fonts.bodyBold, fontSize: 11, color: withAlpha(palette.chalk, 0.8), letterSpacing: 0.5 },
  colHeader: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.4 },
  colHeaderActive: { color: palette.chalk, fontFamily: fonts.bodyBold },
  logo: { width: 24, height: 24 },
  // Same footprint as a single logo, so the season text lines up with the rows around it.
  pair: { flexDirection: 'row', alignItems: 'center', width: 24 },
  pairLogo: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pairImg: { width: 15, height: 15 },
  season: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  team: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginTop: 1 },
  now: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.8 },
  cell: { textAlign: 'right', fontFamily: fonts.bodySemi, fontSize: 13, color: withAlpha(palette.chalk, 0.78) },
  careerBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.12), marginTop: 4 },
  careerLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.muted },
  careerValue: { fontFamily: fonts.bodyBold, color: palette.chalk },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 28, color: palette.chalk },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: palette.muted, textAlign: 'center' },
});
