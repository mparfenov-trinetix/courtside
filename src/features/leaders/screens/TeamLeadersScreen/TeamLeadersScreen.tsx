import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useRef } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, ListSkeleton, ScreenHeader } from '@/components';
import { useLeagueTeamStats, useTeams , useRefresh } from '@/hooks';
import type { Team, TeamStatRow } from '@/lib/espn';
import { TEAM_METRICS, formatMetric, metricByKey, ordinal, type TeamMetric } from '@/lib/league';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { useTeamStore } from '@/state';
import { openDetail } from '@/navigation';
import { TAB_LABEL, FULL } from './constants';

export function TeamLeadersScreen() {
  const insets = useSafeAreaInsets();
  const { stat } = useLocalSearchParams<{ stat?: string }>();
  const active = metricByKey((TEAM_METRICS.some((m) => m.key === stat) ? stat : 'ppg') as TeamMetric['key']);
  const currentTeamId = useTeamStore((s) => s.currentTeamId);
  const { data: rows, isPending, error, refetch } = useLeagueTeamStats();
  const { data: teams } = useTeams();
  const refreshControl = useRefresh([['leagueTeamStats']]);
  const listRef = useRef<FlatList>(null);

  const ranked = [...(rows ?? [])].sort((a, b) =>
    active.lowerBetter ? a[active.key] - b[active.key] : b[active.key] - a[active.key],
  );
  const best = ranked[0]?.[active.key] ?? 0;
  const worst = ranked[ranked.length - 1]?.[active.key] ?? 0;

  const pick = (key: TeamMetric['key']) => {
    router.setParams({ stat: key });
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      <ScreenHeader title="Team Leaders" color={palette.chalk} />

      <Animated.View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
          {TEAM_METRICS.map((m) => {
            const isActive = m.key === active.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => pick(m.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                style={({ pressed }) => [
                  styles.tab,
                  {
                    backgroundColor: isActive ? withAlpha(palette.chalk, 0.12) : withAlpha(palette.chalk, pressed ? 0.06 : 0.04),
                    borderColor: isActive ? withAlpha(palette.chalk, 0.3) : 'transparent',
                  },
                ]}>
                <Text style={[styles.tabLabel, { color: isActive ? palette.chalk : palette.muted }]}>
                  {TAB_LABEL[m.key] ?? m.short}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      {isPending ? (
        <ListSkeleton count={10} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : (
        <FlatList
          ref={listRef}
          data={ranked}
          refreshControl={refreshControl}
          keyExtractor={(r) => r.teamId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 6 }}
          ListHeaderComponent={<Text style={styles.categoryLabel}>{FULL[active.key]}</Text>}
          renderItem={({ item, index }) => (
            <TeamRow
              row={item}
              team={teams?.find((t) => t.id === item.teamId)}
              rank={index + 1}
              metric={active}
              best={best}
              worst={worst}
              mine={item.teamId === currentTeamId}
              index={index}
            />
          )}
        />
      )}
    </View>
  );
}

function TeamRow({
  row,
  team,
  rank,
  metric,
  best,
  worst,
  mine,
  index,
}: {
  row: TeamStatRow;
  team?: Team;
  rank: number;
  metric: TeamMetric;
  best: number;
  worst: number;
  mine: boolean;
  index: number;
}) {
  const color = team?.color ? (team.color.startsWith('#') ? team.color : `#${team.color}`) : palette.muted;
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
  root: { flex: 1 },
  tabsScroll: { marginBottom: 4, flexGrow: 0 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  tab: { height: 40, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontFamily: fonts.bodySemi, fontSize: 14 },
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
    backgroundColor: withAlpha('#FFFFFF', 0.05),
  },
  rank: { width: 24, textAlign: 'center', fontFamily: fonts.display, fontSize: 20, color: palette.muted },
  rankTop: { color: palette.chalk },
  logo: { width: 34, height: 34 },
  mid: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: palette.chalk },
  value: { fontFamily: fonts.display, fontSize: 22, color: withAlpha(palette.chalk, 0.8) },
  track: { height: 4, borderRadius: 2, backgroundColor: withAlpha(palette.chalk, 0.07), overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
