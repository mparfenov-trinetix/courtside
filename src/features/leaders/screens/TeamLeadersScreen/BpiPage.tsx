import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ListSkeleton } from '@/components';
import { usePowerIndex, useRefresh } from '@/hooks';
import type { PowerRow, Team } from '@/lib/espn';
import { fontSize, fonts, palette, radius, space, surfaces, teamTheme, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { READABLE } from '@/lib/layout';

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}`;
const pct = (n: number) => (n >= 10 ? `${Math.round(n)}%` : n >= 0.1 ? `${n.toFixed(1)}%` : '<0.1%');

/**
 * ESPN's Basketball Power Index as the last page of the Team Leaders pager: every team by its rating (the points it would beat an average team
 * by), split into offense and defense, with ESPN's projection of the rest of the season (final record, the title chance).
 */
export const BpiPage = memo(function BpiPage({ teams, currentTeamId, width }: { teams: Team[] | undefined; currentTeamId: string | null; width: number }) {
  const insets = useSafeAreaInsets();
  const { data, isPending } = usePowerIndex();
  const refreshControl = useRefresh([['powerIndex']]);
  const [best, worst] = useMemo(() => [Math.max(...(data ?? []).map((r) => r.bpi), 0), Math.min(...(data ?? []).map((r) => r.bpi), 0)], [data]);
  return (
    <View style={{ width }}>
      {isPending ? (
        <ListSkeleton count={8} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No ratings yet" text="ESPN publishes its power index once the season is under way." placement="center" />
      ) : (
        <FlatList
          data={data}
          refreshControl={refreshControl}
          keyExtractor={(r) => r.teamId}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          contentContainerStyle={[READABLE, { paddingHorizontal: space.lg, paddingBottom: insets.bottom + 24, gap: 6 }]}
          ListHeaderComponent={
            <Text style={styles.category}>
              {`Basketball Power Index: the points a team would beat an average team by, on a neutral court. ESPN's rating, with its projection of the season.`}
            </Text>
          }
          renderItem={({ item }) => <Row row={item} team={teams?.find((t) => t.id === item.teamId)} mine={item.teamId === currentTeamId} best={best} worst={worst} />}
        />
      )}
    </View>
  );
});

function Row({ row, team, mine, best, worst }: { row: PowerRow; team?: Team; mine: boolean; best: number; worst: number }) {
  const color = team ? teamTheme(team).brand : palette.muted;
  const span = best - worst || 1;
  const frac = 0.1 + 0.9 * ((row.bpi - worst) / span);
  return (
    <Pressable
      onPress={() => openDetail(`/team/${row.teamId}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`${row.rank}, ${team?.displayName ?? ''}, rating ${signed(row.bpi)}`}
      style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <View style={[styles.row, mine && { borderColor: withAlpha(color, 0.8), backgroundColor: withAlpha(color, 0.12) }]}>
        <Text style={[styles.rank, row.rank <= 3 && { color: palette.chalk }]}>{row.rank}</Text>
        {team ? <Image source={team.logoDark || team.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.logo} />}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.top}>
            <Text style={styles.name} numberOfLines={1}>{team?.displayName ?? row.teamId}</Text>
            <Text style={[styles.value, row.rank === 1 && { color: palette.chalk }]}>{signed(row.bpi)}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${frac * 100}%`, backgroundColor: color, opacity: row.rank <= 10 ? 1 : 0.55 }]} />
          </View>
          <Text style={styles.sub} numberOfLines={1}>
            Off {signed(row.offense)} · Def {signed(row.defense)} · Proj {Math.round(row.projWins)}–{Math.round(row.projLosses)} · Title {pct(row.title)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  category: { fontFamily: fonts.body, fontSize: fontSize.small, color: palette.muted, marginBottom: space.sm, marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, paddingHorizontal: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: 'transparent', backgroundColor: surfaces.card },
  rank: { width: 24, textAlign: 'center', fontFamily: fonts.display, fontSize: 20, color: palette.muted },
  logo: { width: 34, height: 34 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: palette.chalk },
  value: { fontFamily: fonts.display, fontSize: 22, color: withAlpha(palette.chalk, 0.8) },
  track: { height: 4, borderRadius: 2, backgroundColor: surfaces.raised, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  sub: { fontFamily: fonts.body, fontSize: fontSize.caption, color: palette.muted },
});
