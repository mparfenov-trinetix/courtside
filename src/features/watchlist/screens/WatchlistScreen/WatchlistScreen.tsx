import { Image } from 'expo-image';
import { useMemo } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StarIcon , ScreenHeader } from '@/components';
import { WatchRow } from '../../components';
import { useTeams , useRefresh } from '@/hooks';
import { fonts, palette, teamTheme, withAlpha } from '@/lib/theme';
import { useWatchlist, type WatchedPlayer } from '@/state';

export function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const { players, toggle } = useWatchlist();
  const { data: teams } = useTeams();
  const refreshControl = useRefresh([['playerStats'], ['playerGameLog']]);

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

      {players.length === 0 ? (
        <View style={styles.empty}>
          <StarIcon color={withAlpha(palette.chalk, 0.4)} size={40} />
          <Text style={styles.emptyTitle}>No players yet</Text>
          <Text style={styles.emptyText}>Tap the star on a player&apos;s card to follow them here.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          refreshControl={refreshControl}
          keyExtractor={(p) => p.id}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              {section.team?.logoDark || section.team?.logo ? (
                <Image source={section.team?.logoDark || section.team?.logo} style={styles.sectionLogo} contentFit="contain" />
              ) : null}
              <Text style={styles.sectionTitle}>{section.team?.displayName ?? 'Team'}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => {
            const accent = teamTheme(section.team).accent;
            return (
              <Animated.View entering={FadeInDown.delay(index * 40).duration(240)} style={styles.rowWrap}>
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
  sectionTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: withAlpha(palette.chalk, 0.6),
  },
  rowWrap: { marginBottom: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 30, color: palette.chalk },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: palette.muted, textAlign: 'center' },
});
