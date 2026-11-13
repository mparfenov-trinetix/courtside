import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, ListSkeleton } from '@/components';
import { useLeaderCategory, useRefresh } from '@/hooks';
import type { LeaderCategory, LeaderEntry, Team } from '@/lib/espn';
import { fonts, palette, surfaces, teamTheme, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';

const PAGE = 10;

/** One ESPN category of the League Leaders pager: the top fifty, ten at a time, each page with its own scroll position. */
export function LeaderPage({ category, title, teams }: { category: LeaderCategory; title: string; teams: Team[] | undefined }) {
  const insets = useSafeAreaInsets();
  const { data, isPending, error, refetch } = useLeaderCategory(category, 50);
  const refreshControl = useRefresh([['leaders']]);
  const [displayCount, setDisplayCount] = useState(PAGE);

  if (isPending) return <ListSkeleton count={10} />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  const all = data ?? [];
  if (all.length === 0) return <EmptyState title="No stats yet" text="Leaders will appear once the season starts." placement="center" />;

  // Only the rows shown get their team's name and color (fifty of them were worked out on every render, ten are on screen).
  const leaders = all.slice(0, displayCount).map((entry) => {
    const team = teams?.find((t) => t.id === entry.teamId);
    return team ? { ...entry, teamAbbr: team.abbreviation, teamColor: teamTheme(team).brand } : entry;
  });
  const hasMore = displayCount < all.length;

  return (
    <FlatList
      data={leaders}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      keyExtractor={(item, i) => `${category}-${item.athleteId}-${i}`}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
      onEndReached={() => {
        if (hasMore) setDisplayCount((n) => Math.min(n + PAGE, all.length));
      }}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={<Text style={styles.categoryLabel}>{title}</Text>}
      ListFooterComponent={
        hasMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={palette.muted} />
          </View>
        ) : (
          <Text style={styles.footerText}>Top {all.length} leaders</Text>
        )
      }
      renderItem={({ item, index }) => <LeaderRow entry={item} rank={index + 1} />}
    />
  );
}

function LeaderRow({ entry, rank }: { entry: LeaderEntry; rank: number }) {
  const teamColor = entry.teamColor.startsWith('#') ? entry.teamColor : `#${entry.teamColor}`;
  const canNavigate = !!entry.athleteId && !!entry.teamId;

  return (
    <Pressable accessibilityRole="button"
      onPress={() => canNavigate && openDetail({ pathname: '/player/[id]', params: { id: entry.athleteId, teamId: entry.teamId } })}
      style={({ pressed }) => [styles.row, pressed && canNavigate && { opacity: 0.7 }]}>
      <Text style={[styles.rank, rank <= 3 && styles.rankTop]}>{rank}</Text>

      <View style={[styles.headshotWrap, { backgroundColor: withAlpha(teamColor, 0.25) }]}>
        {entry.headshot ? (
          <Image source={entry.headshot} style={styles.headshot} contentFit="cover" transition={100} />
        ) : (
          <Text style={styles.initials}>
            {entry.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')}
          </Text>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.playerName} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={styles.teamAbbr}>{entry.teamAbbr}</Text>
      </View>

      {/* The percentages carry what he makes a game: "58%" with "(1.1)" beside it. */}
      <Text style={[styles.value, rank === 1 && { color: palette.chalk }]}>
        {entry.displayValue}
        {entry.made ? <Text style={styles.made}> ({entry.made})</Text> : null}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  categoryLabel: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, marginBottom: 8, marginTop: 4 },
  footer: { paddingVertical: 16, alignItems: 'center' },
  footerText: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, textAlign: 'center', paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: surfaces.card },
  rank: { width: 22, fontFamily: fonts.bodySemi, fontSize: 15, color: palette.muted, textAlign: 'center' },
  rankTop: { color: palette.chalk, fontFamily: fonts.bodyBold },
  headshotWrap: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  headshot: { width: 56, height: 48 },
  initials: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  playerName: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.chalk },
  teamAbbr: { fontFamily: fonts.body, fontSize: 13, color: palette.muted, marginTop: 1 },
  value: { fontFamily: fonts.display, fontSize: 28, color: palette.muted },
  made: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.muted },
});
