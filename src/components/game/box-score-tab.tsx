import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LineupsCard } from '@/components/game/lineups-card';
import { FlashOverlay } from '@/components/live-flash';
import type { BoxScorePlayer, BoxScoreTeam } from '@/lib/espn';
import { COLS, COL_W, parseStatNum, type Col, type SortDir } from '@/lib/game-model';
import type { QuarterStats } from '@/lib/quarter-stats';
import { fonts, palette, withAlpha } from '@/lib/theme';

const PLAYER_COL_W = 134;
const HEADSHOT_SIZE = 28;

function statStyle(col: Col, value?: string): object[] {
  const base = { width: COL_W[col], textAlign: 'right' as const, fontFamily: fonts.bodySemi, fontSize: 13 };
  const num = value != null ? parseInt(value, 10) : NaN;
  const pts = col === 'PTS' && num >= 20;
  const to = col === 'TO' && num >= 4;
  const pm = col === '+/-' && !isNaN(num) && num !== 0;
  const color = pts ? palette.chalk : to ? '#F87171' : pm ? (num > 0 ? '#34D399' : '#F87171') : withAlpha(palette.chalk, 0.75);
  return [base, { color, fontFamily: pts || to ? fonts.bodyBold : fonts.bodySemi }];
}

/** Player lines for one team at a time, sortable by any column. */
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
}) {
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [sortCol, setSortCol] = useState<Col | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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

  const sorted = effectiveSort
    ? [...players].sort((a, b) => {
        const av = parseStatNum(a.stats[effectiveSort]);
        const bv = parseStatNum(b.stats[effectiveSort]);
        return effectiveDir === 'desc' ? bv - av : av - bv;
      })
    : null;

  if (!hasStarted) {
    return <Text style={styles.empty}>Available after tip-off</Text>;
  }

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
        <Animated.View key={side} entering={FadeInDown.duration(240)}>
          <Text style={styles.note}>
            {filtered ? `${periodLabel} stats rebuilt from play-by-play · tap a column to sort` : 'Tap a column header to sort'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
            <View>
              <View style={styles.row}>
                <View style={[styles.playerCol, { justifyContent: 'flex-start' }]}>
                  <Text style={styles.playerColHeader}>PLAYER</Text>
                </View>
                {cols.map((col) => {
                  const active = effectiveSort === col;
                  return (
                    <Pressable key={col} onPress={() => handleSort(col)} style={{ width: COL_W[col], alignItems: 'flex-end' }}>
                      <Text style={[styles.colHeader, active && styles.colHeaderActive]}>
                        {col}
                        {active ? (effectiveDir === 'desc' ? ' ▾' : ' ▴') : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {sorted ? (
                sorted.map((p, i) => <PlayerRow key={p.id || String(i)} player={p} cols={cols} shade={i % 2 === 1} teamId={team.team.id} />)
              ) : (
                <>
                  {team.starters.length > 0 && (
                    <>
                      <Text style={styles.group}>Starters</Text>
                      {team.starters.map((p, i) => (
                        <PlayerRow key={p.id || String(i)} player={p} cols={cols} shade={i % 2 === 1} teamId={team.team.id} />
                      ))}
                    </>
                  )}
                  {team.bench.length > 0 && (
                    <>
                      <Text style={styles.group}>Bench</Text>
                      {team.bench.map((p, i) => (
                        <PlayerRow key={p.id || String(i)} player={p} cols={cols} shade={i % 2 === 1} teamId={team.team.id} />
                      ))}
                    </>
                  )}
                </>
              )}

              {Object.keys(teamTotals).length > 0 && (
                <View style={[styles.row, styles.totalsRow]}>
                  <View style={styles.playerCol}>
                    <Text style={styles.totalsLabel}>TEAM</Text>
                  </View>
                  {cols.map((col) => (
                    <Text key={col} style={[{ width: COL_W[col], textAlign: 'right' }, styles.totalsValue]}>
                      {teamTotals[col] || '–'}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      ) : (
        <Text style={styles.empty}>No player stats for this period</Text>
      )}

      {derived && (
        <View style={styles.lineups}>
          <LineupsCard
            derived={derived}
            teamId={team.team.id}
            players={[...team.starters, ...team.bench]}
            periods={selPeriods}
          />
        </View>
      )}
    </View>
  );
}

function PlayerRow({ player, cols, shade, teamId }: { player: BoxScorePlayer; cols: Col[]; shade: boolean; teamId: string }) {
  const canNavigate = !!player.id;
  return (
    <Pressable
      onPress={() => canNavigate && router.push({ pathname: '/player/[id]', params: { id: player.id, teamId } })}
      accessibilityRole={canNavigate ? 'button' : 'none'}
      style={({ pressed }) => [styles.row, shade && styles.shade, pressed && canNavigate && { opacity: 0.7 }]}>
      <FlashOverlay radius={8} signature={cols.map((c) => player.stats[c] ?? '').join('|')} />
      <View style={styles.playerCol}>
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
      </View>
      {cols.map((col) => (
        <Text key={col} style={statStyle(col, player.stats[col])}>
          {player.stats[col] ?? '–'}
        </Text>
      ))}
    </Pressable>
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
  group: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: palette.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 2,
    paddingLeft: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingRight: 16, borderRadius: 8 },
  shade: { backgroundColor: withAlpha('#FFFFFF', 0.03) },
  playerCol: { width: PLAYER_COL_W, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 6 },
  playerColHeader: { fontFamily: fonts.bodyBold, fontSize: 11, color: withAlpha(palette.chalk, 0.8), letterSpacing: 0.5 },
  colHeader: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.4 },
  colHeaderActive: { color: palette.chalk, fontFamily: fonts.bodyBold },
  headshot: { width: HEADSHOT_SIZE, height: HEADSHOT_SIZE, borderRadius: HEADSHOT_SIZE / 2, overflow: 'hidden' },
  headshotPlaceholder: { backgroundColor: withAlpha(palette.chalk, 0.1), alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted },
  playerName: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk },
  playerPos: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginTop: 1 },
  totalsRow: { marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(palette.chalk, 0.12), paddingTop: 10 },
  totalsLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.muted },
  totalsValue: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.chalk },
  lineups: { marginTop: 16 },
  empty: { padding: 40, textAlign: 'center', fontFamily: fonts.body, fontSize: 15, color: palette.muted },
});
