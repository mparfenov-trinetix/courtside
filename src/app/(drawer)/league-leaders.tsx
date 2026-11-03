import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, LoadingState, ScreenHeader } from '@/components/ui';
import { useLeagueLeaders, useTeams } from '@/hooks/queries';
import { useRefresh } from '@/hooks/use-refresh';
import type { LeaderEntry } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { openDetail } from '@/lib/nav';

type Category = 'ppg' | 'rpg' | 'apg' | 'stpg' | 'bpg' | 'mpg' | 'pfpg';

const TABS: { key: Category; label: string; full: string }[] = [
  { key: 'ppg', label: 'PPG', full: 'Points Per Game' },
  { key: 'rpg', label: 'RPG', full: 'Rebounds Per Game' },
  { key: 'apg', label: 'APG', full: 'Assists Per Game' },
  { key: 'stpg', label: 'STL', full: 'Steals Per Game' },
  { key: 'bpg', label: 'BLK', full: 'Blocks Per Game' },
  { key: 'mpg', label: 'MPG', full: 'Minutes Per Game' },
  { key: 'pfpg', label: 'PF', full: 'Fouls Per Game' },
];

const PAGE = 10;

export default function LeagueLeaders() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<Category>('ppg');
  const [displayCount, setDisplayCount] = useState(PAGE);
  const { data, isPending, error, refetch } = useLeagueLeaders();
  const refreshControl = useRefresh([['leaders']]);
  const { data: teams } = useTeams();

  const switchTab = (tab: Category) => {
    setActive(tab);
    setDisplayCount(PAGE);
  };

  const allLeaders = (data?.[active] ?? []).map((entry) => {
    const team = teams?.find((t) => t.id === entry.teamId);
    return team ? { ...entry, teamAbbr: team.abbreviation, teamColor: team.color } : entry;
  });
  const leaders = allLeaders.slice(0, displayCount);
  const hasMore = displayCount < allLeaders.length;
  const activeTab = TABS.find((t) => t.key === active)!;

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      <ScreenHeader title="League Leaders" color={palette.chalk} />

      {/* Category tabs — scrollable */}
      <Animated.View entering={FadeIn.duration(300)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabs}>
          {TABS.map((tab) => {
            const isActive = tab.key === active;
            return (
              <Pressable
                key={tab.key}
                onPress={() => switchTab(tab.key)}
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
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      {isPending ? (
        <LoadingState label={`Loading ${activeTab.full}`} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : leaders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No stats yet</Text>
          <Text style={styles.emptyText}>Leaders will appear once the season starts.</Text>
        </View>
      ) : (
        <FlatList
          key={active}
          data={leaders}
          refreshControl={refreshControl}
          keyExtractor={(item, i) => `${active}-${item.athleteId}-${i}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
          onEndReached={() => {
            if (hasMore) setDisplayCount((n) => Math.min(n + PAGE, allLeaders.length));
          }}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <Text style={styles.categoryLabel}>{activeTab.full}</Text>
          }
          ListFooterComponent={
            hasMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={palette.muted} />
              </View>
            ) : allLeaders.length > 0 ? (
              <Text style={styles.footerText}>Top {allLeaders.length} leaders</Text>
            ) : undefined
          }
          renderItem={({ item, index }) => (
            <LeaderRow entry={item} rank={index + 1} index={index} />
          )}
        />
      )}
    </View>
  );
}

function LeaderRow({ entry, rank, index }: { entry: LeaderEntry; rank: number; index: number }) {
  const teamColor = entry.teamColor.startsWith('#') ? entry.teamColor : `#${entry.teamColor}`;
  const canNavigate = !!entry.athleteId && !!entry.teamId;

  return (
    <Pressable
      onPress={() => canNavigate && openDetail({ pathname: '/player/[id]', params: { id: entry.athleteId, teamId: entry.teamId } })}
      style={({ pressed }) => pressed && canNavigate ? { opacity: 0.7 } : undefined}>
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(280).easing(Easing.out(Easing.cubic))}
      style={styles.row}>
      {/* Rank */}
      <Text style={[styles.rank, rank <= 3 && styles.rankTop]}>{rank}</Text>

      {/* Headshot */}
      <View style={[styles.headshotWrap, { backgroundColor: withAlpha(teamColor, 0.25) }]}>
        {entry.headshot ? (
          <Image source={entry.headshot} style={styles.headshot} contentFit="cover" transition={100} />
        ) : (
          <Text style={styles.initials}>
            {entry.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </Text>
        )}
      </View>

      {/* Name + team */}
      <View style={{ flex: 1 }}>
        <Text style={styles.playerName} numberOfLines={1}>{entry.name}</Text>
        <Text style={styles.teamAbbr}>{entry.teamAbbr}</Text>
      </View>

      {/* Value */}
      <Text style={[styles.value, rank === 1 && { color: palette.chalk }]}>{entry.displayValue}</Text>
    </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabsScroll: {
    marginBottom: 4,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  tab: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  categoryLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.muted,
    marginBottom: 8,
    marginTop: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: palette.chalk,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.muted,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: withAlpha('#FFFFFF', 0.05),
  },
  rank: {
    width: 22,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: palette.muted,
    textAlign: 'center',
  },
  rankTop: {
    color: palette.chalk,
    fontFamily: fonts.bodyBold,
  },
  headshotWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headshot: {
    width: 56,
    height: 48,
  },
  initials: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: palette.chalk,
  },
  playerName: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.chalk,
  },
  teamAbbr: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.muted,
    marginTop: 1,
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: palette.muted,
  },
});
