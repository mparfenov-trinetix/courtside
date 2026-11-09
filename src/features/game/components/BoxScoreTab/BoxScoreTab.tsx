import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LegendSheet } from '../LegendSheet';
import { LineupsCard } from '../LineupsCard';
import { DetailedTable } from './DetailedTable';
import { SimpleTable } from './SimpleTable';
import { SIMPLE_COLS } from './constants';
import type { BoxScorePlayer, BoxScoreTeam } from '@/lib/espn';
import { COLS, formatRating, gameRating, parseStatNum, type Col, type SortDir, QuarterStats } from '@/lib/game';
import { fonts, palette, surfaces, withAlpha } from '@/lib/theme';

/** A player's line with his Courtside Rating added as a column (it is worked out here: ESPN's box score has no rating). */
const withRating = (list: BoxScorePlayer[]): BoxScorePlayer[] =>
  list.map((p) => ({ ...p, stats: { ...p.stats, CR: formatRating(gameRating(p.stats)) } }));

/**
 * Player lines for one team at a time, sortable by any column, in two views. The default one has a bigger photo and name (a "Starter" tag on
 * the starters) and only the rating, points, rebounds and assists, which fit the screen. The detailed one has every stat: the player column
 * stays pinned and shrinks while the stats scroll sideways under a scroll indicator. Starters carry a golden edge instead of a divider; a
 * "Legend" button in the table's corner explains the column names.
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
  completed = false,
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
  /** The game is over: only then is a rating given (a rating of half a game is not one). */
  completed?: boolean;
  derived: QuarterStats | null;
  selPeriods: number[] | null;
  /** Opaque color of the pinned player column, so it matches the page behind the scrolling stats. */
  background?: string;
}) {
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [detailed, setDetailed] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [sortCol, setSortCol] = useState<Col | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Rows remount when the period changes, so switching the filter doesn't light them up like a live update would.
  const periodKey = selPeriods?.join(',') ?? 'full';
  const team = side === 'home' ? home : away;
  // The rating is for the whole of a finished game: not for a period, and not while the game is on.
  const rated = completed && !filtered;
  const players = rated ? withRating(side === 'home' ? homePlayers : awayPlayers) : side === 'home' ? homePlayers : awayPlayers;
  const teamTotals = side === 'home' ? totals.home : totals.away;
  const cols: Col[] = (filtered ? [...COLS] : COLS.filter((c) => c === 'CR' || team.columnNames.includes(c))).filter((c) => c !== 'CR' || rated);
  // Points first, as the box score is read; a period's own lines by minutes (the ones who played in it come first).
  const effectiveSort: Col = sortCol ?? (filtered ? 'MIN' : 'PTS');
  const effectiveDir: SortDir = sortCol ? sortDir : 'desc';

  const handleSort = (col: Col) => {
    if (sortCol === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const toggleDetailed = (on: boolean) => {
    Haptics.selectionAsync();
    setDetailed(on);
    // A sort by a column the default view does not have would be invisible there: back to points.
    if (!on && sortCol && !SIMPLE_COLS.includes(sortCol as (typeof SIMPLE_COLS)[number])) {
      setSortCol(null);
      setSortDir('desc');
    }
  };

  const rows = [...players].sort((a, b) => {
    const av = parseStatNum(a.stats[effectiveSort]);
    const bv = parseStatNum(b.stats[effectiveSort]);
    return effectiveDir === 'desc' ? bv - av : av - bv;
  });
  const sort = { col: effectiveSort, dir: effectiveDir, onSort: handleSort };

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
        <Animated.View key={side}>
          <View style={styles.viewRow}>
            <Text style={styles.viewLabel}>Detailed view</Text>
            <Switch
              value={detailed}
              onValueChange={toggleDetailed}
              trackColor={{ false: surfaces.raised, true: palette.win }}
              ios_backgroundColor={surfaces.raised}
              accessibilityLabel="Detailed view"
            />
          </View>
          {filtered ? <Text style={styles.note}>{periodLabel} stats rebuilt from play-by-play</Text> : null}

          {detailed ? (
            <DetailedTable
              rows={rows}
              cols={cols}
              rated={rated}
              teamId={team.team.id}
              totals={teamTotals}
              sort={sort}
              background={background}
              periodKey={periodKey}
              onLegend={() => setLegendOpen(true)}
            />
          ) : (
            <SimpleTable rows={rows} rated={rated} teamId={team.team.id} totals={teamTotals} sort={sort} periodKey={periodKey} onLegend={() => setLegendOpen(true)} />
          )}
        </Animated.View>
      ) : (
        <Text style={styles.empty}>No player stats for this period</Text>
      )}

      {derived && (
        <View style={styles.lineups}>
          <LineupsCard derived={derived} teamId={team.team.id} players={[...team.starters, ...team.bench]} periods={selPeriods} />
        </View>
      )}

      <LegendSheet visible={legendOpen} onClose={() => setLegendOpen(false)} />
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
  viewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 6 },
  viewLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk },
  note: { fontFamily: fonts.body, fontSize: 11, color: palette.muted, marginBottom: 6, paddingHorizontal: 16 },
  lineups: { marginTop: 16 },
  empty: { padding: 40, textAlign: 'center', fontFamily: fonts.body, fontSize: 15, color: palette.muted },
});
