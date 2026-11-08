import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { memo, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRefresh } from '@/hooks';
import type { Team, TeamStatRow } from '@/lib/espn';
import { formatMetric, ordinal, type TeamMetric } from '@/lib/league';
import { fonts, palette, withAlpha, surfaces, teamTheme } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { FULL } from './constants';

/**
 * One stat of the Team Leaders pager: every team ranked by it. All pages rank the same cached league feed, so a page costs a sort
 * and thirty rows; each keeps its own scroll position.
 */
export const MetricPage = memo(function MetricPage({
  metric,
  rows,
  teams,
  currentTeamId,
  width,
}: {
  metric: TeamMetric;
  rows: TeamStatRow[];
  teams: Team[] | undefined;
  currentTeamId: string | null;
  width: number;
}) {
  const insets = useSafeAreaInsets();
  const refreshControl = useRefresh([['leagueTeamStats']]);
  const ranked = useMemo(
    () => [...rows].sort((a, b) => (metric.lowerBetter ? a[metric.key] - b[metric.key] : b[metric.key] - a[metric.key])),
    [rows, metric],
  );
  const best = ranked[0]?.[metric.key] ?? 0;
  const worst = ranked[ranked.length - 1]?.[metric.key] ?? 0;

  return (
    <View style={{ width }}>
      <FlatList
        data={ranked}
        refreshControl={refreshControl}
        keyExtractor={(r) => r.teamId}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 6 }}
        ListHeaderComponent={<Text style={styles.categoryLabel}>{FULL[metric.key]}</Text>}
        renderItem={({ item, index }) => (
          <TeamRow
            row={item}
            team={teams?.find((t) => t.id === item.teamId)}
            rank={index + 1}
            metric={metric}
            best={best}
            worst={worst}
            mine={item.teamId === currentTeamId}
          />
        )}
      />
    </View>
  );
});

function TeamRow({
  row,
  team,
  rank,
  metric,
  best,
  worst,
  mine,
}: {
  row: TeamStatRow;
  team?: Team;
  rank: number;
  metric: TeamMetric;
  best: number;
  worst: number;
  mine: boolean;
}) {
  // A fill (the bar), so the team's own bright color, lifted when it is nearly black: the Spurs' bar was invisible.
  const color = team ? teamTheme(team).brand : palette.muted;
  // Bar length: best = full, worst = a stub, so differences read at a glance.
  const span = Math.abs(best - worst) || 1;
  const frac = 0.12 + 0.88 * (Math.abs(row[metric.key] - worst) / span);

  return (
    <Pressable
      onPress={() => openDetail(`/team/${row.teamId}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${ordinal(rank)}, ${row.name}, ${formatMetric(metric, row[metric.key])}`}
      style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <Animated.View
        style={[styles.row, mine && { borderColor: withAlpha(color, 0.8), backgroundColor: withAlpha(color, 0.12) }]}>
        <Text style={[styles.rank, rank <= 3 && styles.rankTop]}>{rank}</Text>
        {team ? (
          <Image source={team.logoDark || team.logo} style={styles.logo} contentFit="contain" />
        ) : (
          <View style={styles.logo} />
        )}
        <View style={styles.mid}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
            <Text style={[styles.value, rank === 1 && { color: palette.chalk }]}>{formatMetric(metric, row[metric.key])}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${frac * 100}%`, backgroundColor: color, opacity: rank <= 10 ? 1 : 0.55 }]} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  categoryLabel: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, marginBottom: 8, marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: surfaces.card,
  },
  rank: { width: 24, textAlign: 'center', fontFamily: fonts.display, fontSize: 20, color: palette.muted },
  rankTop: { color: palette.chalk },
  logo: { width: 34, height: 34 },
  mid: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: palette.chalk },
  value: { fontFamily: fonts.display, fontSize: 22, color: withAlpha(palette.chalk, 0.8) },
  track: { height: 4, borderRadius: 2, backgroundColor: surfaces.raised, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
