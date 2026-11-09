import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, ErrorState, ListSkeleton, ScreenHeader, EmptyState } from '@/components';
import { useLeaderCategory, useTeams, useRefresh } from '@/hooks';
import type { LeaderCategory, LeaderEntry } from '@/lib/espn';
import { AwardOdds, Efficiency, HotCold } from '../../components';
import { fonts, palette, withAlpha, surfaces, teamTheme } from '@/lib/theme';
import { openDetail } from '@/navigation';

type Category = LeaderCategory;
type Tab = Category | 'form' | 'eff' | 'odds';

const TABS: { key: Tab; label: string; full: string }[] = [
  { key: 'form', label: 'HOT / COLD', full: 'Hot and cold' },
  { key: 'odds', label: 'ODDS', full: 'Title and award odds' },
  { key: 'ppg', label: 'PPG', full: 'Points Per Game' },
  { key: 'rpg', label: 'RPG', full: 'Rebounds Per Game' },
  { key: 'apg', label: 'APG', full: 'Assists Per Game' },
  { key: 'stpg', label: 'STL', full: 'Steals Per Game' },
  { key: 'bpg', label: 'BLK', full: 'Blocks Per Game' },
  { key: 'eff', label: 'EFF', full: 'Efficiency' },
  { key: 'tpm', label: '3PM', full: '3-Pointers Made Per Game' },
  { key: 'tppct', label: '3P%', full: '3-Point Percentage' },
  { key: 'fgpct', label: 'FG%', full: 'Field Goal Percentage' },
  { key: 'ftpct', label: 'FT%', full: 'Free Throw Percentage' },
  { key: 'topg', label: 'TOV', full: 'Turnovers Per Game' },
  { key: 'dd', label: 'DD', full: 'Double-Doubles' },
  { key: 'mpg', label: 'MPG', full: 'Minutes Per Game' },
  { key: 'pfpg', label: 'PF', full: 'Fouls Per Game' },
];

const PAGE = 10;

export function LeagueLeadersScreen() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<Tab>('ppg');
  const [displayCount, setDisplayCount] = useState(PAGE);
  // Only the open category is read (the form tabs read their own).
  const own = active !== 'form' && active !== 'eff' && active !== 'odds';
  const { data, isPending, error, refetch } = useLeaderCategory(own ? active : 'ppg', 50, own);
  const refreshControl = useRefresh([['leaders']]);
  const { data: teams } = useTeams();

  const switchTab = (tab: Tab) => {
    setActive(tab);
    setDisplayCount(PAGE);
  };

  const allLeaders = active === 'form' || active === 'eff' || active === 'odds' ? [] : data ?? [];
  // Only the rows shown get their team's name and color (fifty of them were worked out on every render, ten are on screen).
  const leaders = allLeaders.slice(0, displayCount).map((entry) => {
    const team = teams?.find((t) => t.id === entry.teamId);
    return team ? { ...entry, teamAbbr: team.abbreviation, teamColor: teamTheme(team).brand } : entry;
  });
  const hasMore = displayCount < allLeaders.length;
  const activeTab = TABS.find((t) => t.key === active)!;

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      <ScreenHeader title="League Leaders" color={palette.chalk} />

      {/* Category tabs — scrollable */}
      <Animated.View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabs}>
          {TABS.map((tab) => {
            const isActive = tab.key === active;
            return (
              <Chip key={tab.key} size="lg" active={isActive} label={tab.label} onPress={() => switchTab(tab.key)} hitSlop={4} />
            );
          })}
        </ScrollView>
      </Animated.View>

      {active === 'form' ? (
        <HotCold abbrOf={(id) => teams?.find((t) => t.id === id)?.abbreviation} />
      ) : active === 'odds' ? (
        <AwardOdds />
      ) : active === 'eff' ? (
        <Efficiency abbrOf={(id) => teams?.find((t) => t.id === id)?.abbreviation} />
      ) : isPending ? (
        <ListSkeleton count={10} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : leaders.length === 0 ? (
        <EmptyState title="No stats yet" text="Leaders will appear once the season starts." placement="center" />
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
  categoryLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.muted,
    marginBottom: 8,
    marginTop: 4,
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
    backgroundColor: surfaces.card,
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
