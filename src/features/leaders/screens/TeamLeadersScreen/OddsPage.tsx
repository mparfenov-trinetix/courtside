import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ListSkeleton } from '@/components';
import { useFutures, useRefresh } from '@/hooks';
import type { FuturesEntry, Team } from '@/lib/espn';
import { fontSize, fonts, palette, radius, space, surfaces, teamTheme, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { READABLE } from '@/lib/layout';

const pct = (chance: number) => (chance >= 0.1 ? `${Math.round(chance * 100)}%` : chance >= 0.001 ? `${(chance * 100).toFixed(1)}%` : '<0.1%');

/**
 * The sportsbook's odds to win the title as a page of the Team Leaders pager: all thirty teams, favorite first, with the chance (the line
 * with the book's margin removed) and the team's odds for its conference. The book's opinion, not ESPN's: it moves with the news.
 */
export const OddsPage = memo(function OddsPage({ teams, currentTeamId, width }: { teams: Team[] | undefined; currentTeamId: string | null; width: number }) {
  const insets = useSafeAreaInsets();
  const { data, isPending } = useFutures(false);
  const refreshControl = useRefresh([['futures']]);
  const rows = useMemo(() => (data?.find((m) => m.key === 'title')?.entries ?? []).filter((e) => e.kind === 'team'), [data]);
  // A team's conference chance, from whichever conference market lists it.
  const conference = useMemo(() => {
    const byTeam = new Map<string, FuturesEntry>();
    for (const key of ['east', 'west']) for (const e of data?.find((m) => m.key === key)?.entries ?? []) byTeam.set(e.id, e);
    return byTeam;
  }, [data]);
  return (
    <View style={{ width }}>
      {isPending ? (
        <ListSkeleton count={8} />
      ) : rows.length === 0 ? (
        <EmptyState title="No odds posted" text="The sportsbook posts them once the season is close. Check back soon." placement="center" />
      ) : (
        <FlatList
          data={rows}
          refreshControl={refreshControl}
          keyExtractor={(e) => e.id}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          contentContainerStyle={[READABLE, { paddingHorizontal: space.lg, paddingBottom: insets.bottom + 24, gap: 6 }]}
          ListHeaderComponent={
            <Text style={styles.category}>{`Odds to win the NBA title, as a chance with the sportsbook's margin removed (DraftKings, via ESPN). Not advice.`}</Text>
          }
          renderItem={({ item, index }) => (
            <Row entry={item} rank={index + 1} team={teams?.find((t) => t.id === item.id)} mine={item.id === currentTeamId} lead={rows[0].chance} conference={conference.get(item.id)} />
          )}
        />
      )}
    </View>
  );
});

function Row({ entry, rank, team, mine, lead, conference }: { entry: FuturesEntry; rank: number; team?: Team; mine: boolean; lead: number; conference?: FuturesEntry }) {
  const color = team ? teamTheme(team).brand : palette.muted;
  return (
    <Pressable
      onPress={() => team && openDetail(`/team/${team.id}` as never)}
      disabled={!team}
      accessibilityRole="button"
      accessibilityLabel={`${rank}, ${team?.displayName ?? ''}, ${pct(entry.chance)} to win the title, ${entry.line}`}
      style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <View style={[styles.row, mine && { borderColor: withAlpha(color, 0.8), backgroundColor: withAlpha(color, 0.12) }]}>
        <Text style={[styles.rank, rank <= 3 && { color: palette.chalk }]}>{rank}</Text>
        {team ? <Image source={team.logoDark || team.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.logo} />}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.top}>
            <Text style={styles.name} numberOfLines={1}>{team?.displayName ?? entry.id}</Text>
            <Text style={[styles.value, rank === 1 && { color: palette.chalk }]}>{pct(entry.chance)}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(2, (entry.chance / lead) * 100)}%`, backgroundColor: color, opacity: rank <= 10 ? 1 : 0.55 }]} />
          </View>
          <Text style={styles.sub} numberOfLines={1}>
            {entry.line}
            {conference ? ` · Conference ${pct(conference.chance)} (${conference.line})` : ''}
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
