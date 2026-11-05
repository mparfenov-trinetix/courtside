import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { LineupsCard } from '../LineupsCard';
import { FlashOverlay } from '@/components';
import type { BoxScorePlayer, BoxScoreTeam } from '@/lib/espn';
import { COLS, COL_W, parseStatNum, type Col, type SortDir , QuarterStats } from '@/lib/game';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { PLAYER_COL_W, HEADSHOT_SIZE, ROW_H, HEADER_H, TOTALS_H, GOLD } from './constants';

function statStyle(col: Col, value?: string): object[] {
  const base = { width: COL_W[col], textAlign: 'right' as const, fontFamily: fonts.bodySemi, fontSize: 13 };
  const num = value != null ? parseInt(value, 10) : NaN;
  const pts = col === 'PTS' && num >= 20;
  const to = col === 'TO' && num >= 4;
  const pm = col === '+/-' && !isNaN(num) && num !== 0;
  const color = pts ? palette.chalk : to ? '#F87171' : pm ? (num > 0 ? '#34D399' : '#F87171') : withAlpha(palette.chalk, 0.75);
  return [base, { color, fontFamily: pts || to ? fonts.bodyBold : fonts.bodySemi }];
}

/**
 * Player lines for one team at a time, sortable by any column. The player column stays pinned on the
 * left while the stat columns scroll sideways, and starters carry a golden edge instead of a divider.
 */
export function BoxScoreTab({
  away,
  home,
  awayPlayers,
  homePlayers,
  totals,
  filtered,
  periodLabel,
  hasStarted,
  derived,
  selPeriods,
  background = palette.arena,
}: {
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  /** Players with period-filtered stats already applied. */
  awayPlayers: BoxScorePlayer[];
  homePlayers: BoxScorePlayer[];
  /** Team totals row per side (period-filtered when a period is selected). */
  totals: { away: Record<string, string>; home: Record<string, string> };
  filtered: boolean;
  periodLabel: string;
  hasStarted: boolean;
  derived: QuarterStats | null;
  selPeriods: number[] | null;
  /** Opaque color of the pinned player column, so it matches the page behind the scrolling stats. */
  background?: string;
}) {
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [sortCol, setSortCol] = useState<Col | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });
  // A soft shadow on the pinned column's right edge, only once the stats have scrolled under it.
  const edge = useAnimatedStyle(() => ({ opacity: interpolate(scrollX.get(), [0, 14], [0, 1], Extrapolation.CLAMP) }));

  // Rows remount when the period changes, so switching the filter doesn't light them up like a live update would.
  const periodKey = selPeriods?.join(',') ?? 'full';
  const team = side === 'home' ? home : away;
  const players = side === 'home' ? homePlayers : awayPlayers;
  const teamTotals = side === 'home' ? totals.home : totals.away;
  const cols: Col[] = filtered ? [...COLS] : COLS.filter((c) => team.columnNames.includes(c));
  const effectiveSort: Col | null = sortCol ?? (filtered ? 'MIN' : null);
  const effectiveDir: SortDir = sortCol ? sortDir : 'desc';

  const handleSort = (col: Col) => {
    if (sortCol === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  // Unsorted, the order is the game's own: starters, then the bench (the golden edge marks starters).
  const rows = effectiveSort
    ? [...players].sort((a, b) => {
        const av = parseStatNum(a.stats[effectiveSort]);
        const bv = parseStatNum(b.stats[effectiveSort]);
        return effectiveDir === 'desc' ? bv - av : av - bv;
      })
    : players;

  if (!hasStarted) {
    return <Text style={styles.empty}>Available after tip-off</Text>;
  }

  const hasTotals = Object.keys(teamTotals).length > 0;

  return (
    <View>
      <View style={styles.teamTabs}>
        {(['away', 'home'] as const).map((k) => {
          const t = k === 'home' ? home : away;
          const active = side === k;
          return (
            <Pressable
              key={k}
              onPress={() => setSide(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.teamTab,
                {
                  backgroundColor: active ? withAlpha(palette.chalk, 0.12) : withAlpha(palette.chalk, pressed ? 0.06 : 0.04),
                  borderColor: active ? withAlpha(palette.chalk, 0.3) : 'transparent',
                },
              ]}>
              {t.team.logoDark || t.team.logo ? (
                <Image source={t.team.logoDark || t.team.logo} style={styles.tabLogo} contentFit="contain" />
              ) : null}
              <Text style={[styles.tabLabel, { color: active ? palette.chalk : palette.muted }]}>{t.team.abbreviation}</Text>
            </Pressable>
          );
        })}
      </View>

      {cols.length > 0 && players.length > 0 ? (
        <Animated.View key={side}>
          <Text style={styles.note}>
            {filtered ? `${periodLabel} stats rebuilt from play-by-play · ` : ''}
            Tap a column to sort ·{' '}
            <Text style={{ color: GOLD }}>gold edge</Text> = starter
          </Text>

          <View style={styles.table}>
            {/* Pinned: player names */}
            <View style={[styles.pinned, { backgroundColor: background }]}>
              <View style={[styles.headerCell, { height: HEADER_H }]}>
                <Text style={styles.playerColHeader}>PLAYER</Text>
              </View>
              {rows.map((p, i) => (
                <PlayerCell key={p.id || String(i)} player={p} shade={i % 2 === 1} teamId={team.team.id} />
              ))}
              {hasTotals && (
                <View style={[styles.totalsCell, { height: TOTALS_H }]}>
                  <Text style={styles.totalsLabel}>TEAM</Text>
                </View>
              )}
              <Animated.View pointerEvents="none" style={[styles.edge, edge]}>
                <LinearGradient colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              </Animated.View>
            </View>

            {/* Scrolls sideways: the stat columns */}
            <Animated.ScrollView
              horizontal
              bounces={false}
              overScrollMode="never"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              style={styles.stats}>
              <View>
                <View style={[styles.statsRow, { height: HEADER_H }]}>
                  {cols.map((col) => {
                    const active = effectiveSort === col;
                    return (
                      <Pressable key={col} onPress={() => handleSort(col)} hitSlop={{ top: 6, bottom: 6 }} style={{ width: COL_W[col], alignItems: 'flex-end' }}>
                        <Text style={[styles.colHeader, active && styles.colHeaderActive]}>
                          {col}
                          {active ? (effectiveDir === 'desc' ? ' ▾' : ' ▴') : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {rows.map((p, i) => (
                  <StatsRow key={`${p.id || i}-${periodKey}`} player={p} cols={cols} shade={i % 2 === 1} />
                ))}
                {hasTotals && (
                  <View style={[styles.statsRow, styles.totalsRow, { height: TOTALS_H }]}>
                    {cols.map((col) => (
                      <Text key={col} style={[{ width: COL_W[col], textAlign: 'right' }, styles.totalsValue]}>
                        {teamTotals[col] || '–'}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </Animated.ScrollView>
          </View>
        </Animated.View>
      ) : (
        <Text style={styles.empty}>No player stats for this period</Text>
      )}

      {derived && (
        <View style={styles.lineups}>
          <LineupsCard derived={derived} teamId={team.team.id} players={[...team.starters, ...team.bench]} periods={selPeriods} />
        </View>
      )}
    </View>
  );
}

const openPlayer = (player: BoxScorePlayer, teamId: string) =>
  player.id && openDetail({ pathname: '/player/[id]', params: { id: player.id, teamId } });

/** The pinned half of a row: gold starter edge, avatar and name. */
function PlayerCell({ player, shade, teamId }: { player: BoxScorePlayer; shade: boolean; teamId: string }) {
  return (
    <Pressable
      onPress={() => openPlayer(player, teamId)}
      accessibilityRole={player.id ? 'button' : 'none'}
      accessibilityLabel={`${player.name}${player.starter ? ', starter' : ''}`}
      style={({ pressed }) => [styles.playerCell, shade && styles.shade, pressed && { opacity: 0.7 }]}>
      {player.starter && <View style={styles.starterEdge} />}
      {player.headshot ? (
        <Image source={player.headshot} style={styles.headshot} contentFit="cover" />
      ) : (
        <View style={[styles.headshot, styles.headshotPlaceholder]}>
          <Text style={styles.initials}>{(player.shortName || player.name).charAt(0)}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.playerName} numberOfLines={1}>{player.shortName || player.name}</Text>
        {player.position ? <Text style={styles.playerPos}>{player.position}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * The scrolling half of a row: the stat values. It isn't tappable: this half is swiped sideways all the time, and a
 * swipe that ended on a row used to open that player. The pinned name on the left is the way in.
 */
function StatsRow({ player, cols, shade }: { player: BoxScorePlayer; cols: Col[]; shade: boolean }) {
  return (
    <View style={[styles.statsRow, { height: ROW_H }, shade && styles.shade]}>
      <FlashOverlay radius={8} signature={cols.map((c) => player.stats[c] ?? '').join('|')} />
      {cols.map((col) => (
        <Text key={col} style={statStyle(col, player.stats[col])}>
          {player.stats[col] ?? '–'}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  teamTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  teamTab: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabLogo: { width: 22, height: 22 },
  tabLabel: { fontFamily: fonts.bodySemi, fontSize: 14 },
  note: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginBottom: 6, paddingHorizontal: 16 },
  table: { flexDirection: 'row' },
  pinned: { width: PLAYER_COL_W, backgroundColor: palette.arena, zIndex: 2 },
  edge: { position: 'absolute', top: 0, bottom: 0, right: -8, width: 8 },
  stats: { flex: 1 },
  headerCell: { justifyContent: 'center', paddingLeft: 16 },
  playerCell: { height: ROW_H, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 6 },
  starterEdge: { position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderTopRightRadius: 2, borderBottomRightRadius: 2, backgroundColor: GOLD },
  // Trailing padding lives in the rows, so the zebra shading runs to the screen edge.
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  shade: { backgroundColor: withAlpha('#FFFFFF', 0.04) },
  playerColHeader: { fontFamily: fonts.bodyBold, fontSize: 11, color: withAlpha(palette.chalk, 0.8), letterSpacing: 0.5 },
  colHeader: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.4 },
  colHeaderActive: { color: palette.chalk, fontFamily: fonts.bodyBold },
  headshot: { width: HEADSHOT_SIZE, height: HEADSHOT_SIZE, borderRadius: HEADSHOT_SIZE / 2, overflow: 'hidden' },
  headshotPlaceholder: { backgroundColor: withAlpha(palette.chalk, 0.1), alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted },
  playerName: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  playerPos: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginTop: 1 },
  totalsCell: { justifyContent: 'center', paddingLeft: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.12), marginTop: 2 },
  totalsRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.12), marginTop: 2 },
  totalsLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.muted },
  totalsValue: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.chalk },
  lineups: { marginTop: 16 },
  empty: { padding: 40, textAlign: 'center', fontFamily: fonts.body, fontSize: 15, color: palette.muted },
});
