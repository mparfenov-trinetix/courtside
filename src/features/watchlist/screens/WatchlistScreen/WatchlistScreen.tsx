import { Image } from 'expo-image';

import { useMemo } from 'react';

import { SectionList, StyleSheet, Text, View } from 'react-native';

import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { StarIcon, ScreenHeader, EmptyState } from '@/components';

import { WatchGame, WatchRow } from '../../components';

import { useTeams , useRefresh } from '@/hooks';

import { palette, teamTheme, withAlpha, textStyle } from '@/lib/theme';
import { useWatchlist, type WatchedPlayer } from '@/state';
import { READABLE } from '@/lib/layout';


export function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const { players, toggle, games, toggleGame } = useWatchlist();
  const { data: teams } = useTeams();
  const refreshControl = useRefresh([['playerStats'], ['playerGameLog'], ['game']]);

  const sections = useMemo(() => {
    const byTeam = new Map<string, WatchedPlayer[]>();
    for (const p of players) byTeam.set(p.teamId, [...(byTeam.get(p.teamId) ?? []), p]);
    return [...byTeam.entries()]
      .map(([teamId, data]) => ({ team: teams?.find((t) => t.id === teamId), teamId, data }))
      .sort((a, b) => (a.team?.name ?? '').localeCompare(b.team?.name ?? ''));
  }, [players, teams]);

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      <ScreenHeader title="Watchlist" color={palette.chalk} />

      {players.length === 0 && games.length === 0 ? (
        <EmptyState icon={<StarIcon color={withAlpha(palette.chalk, 0.4)} size={40} />} title="Nothing starred yet" text="Tap the star on a player's card or at the top of a game to keep it here." placement="center" />
      ) : (
        <SectionList
          sections={sections}
          refreshControl={refreshControl}
          keyExtractor={(p) => p.id}
          stickySectionHeadersEnabled={false}
          // Starred games come first: the ones you want to look at quickly.
          ListHeaderComponent={
            games.length > 0 ? (
              <View>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Games · {games.length}</Text>
                </View>
                <View style={styles.gamesList}>
                  {games
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((g) => (
                      <WatchGame key={g.id} game={g} teams={teams} onRemove={() => toggleGame(g)} />
                    ))}
                </View>
              </View>
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[READABLE, { paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }]}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              {section.team?.logoDark || section.team?.logo ? (
                <Image source={section.team?.logoDark || section.team?.logo} style={styles.sectionLogo} contentFit="contain" />
              ) : null}
              <Text style={styles.sectionTitle}>{section.team?.displayName ?? 'Team'}</Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            const accent = teamTheme(section.team).accent;
            return (
              <Animated.View style={styles.rowWrap}>
                <WatchRow
                  player={item}
                  accent={accent}
                  teamLabel={section.team?.abbreviation ?? ''}
                  onRemove={() => toggle(item)}
                />
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 18, paddingBottom: 8, paddingHorizontal: 4 },
  sectionLogo: { width: 22, height: 22 },
  sectionTitle: { ...textStyle.sectionLabel },
  rowWrap: { marginBottom: 8 },
  gamesList: { gap: 8 },
});
