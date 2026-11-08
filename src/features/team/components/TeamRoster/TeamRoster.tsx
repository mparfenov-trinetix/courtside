import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, Card } from '@/components';
import { RosterSkeleton } from './RosterSkeleton';
import { useRefresh, useRoster } from '@/hooks';
import type { Player, Team } from '@/lib/espn';
import { fonts, palette, teamTheme, withAlpha, type TeamTheme, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';

/**
 * One team's roster page: its banner, head coach and players. It has no background of its own: the pager paints
 * the whole screen, header included, in the color of the team being viewed.
 * `active` pages load their data (the visible team and the ones next to it). The rows are built only for `rows` pages
 * (the team the pager last came to rest on and its two neighbours, so a swipe to a neighbour shows real rows at once).
 * Every other page, including each one a long jump scrolls through, shows a skeleton, so no page is ever blank and
 * none has to lay out forty rows of headshots mid-flight.
 */
export function TeamRoster({ team, width, active, rows }: { team: Team; width: number; active: boolean; rows: boolean }) {
  const insets = useSafeAreaInsets();
  const theme = teamTheme(team);
  const { data, isPending, error, refetch } = useRoster(active ? team.id : undefined);
  const refreshControl = useRefresh([['roster', team.id]]);

  const openPlayer = (player: Player) => {
    Haptics.selectionAsync();
    openDetail({ pathname: '/player/[id]', params: { id: player.id, teamId: team.id } });
  };

  return (
    <View style={[styles.page, { width }]}>
      <Card team={theme} padded={false} radius={18} style={styles.banner}>
        {/* On a light disc, so a logo that shares the team's color (Houston's red) never disappears into the banner. */}
        <View style={styles.bannerBadge}>
          <Image source={team.logo} style={styles.bannerLogo} contentFit="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: theme.onPrimary }]}>{team.displayName}</Text>
          <Text style={[styles.bannerSub, { color: withAlpha(theme.onPrimary, 0.75) }]}>
            {data ? `${data.players.length} players` : ' '}
          </Text>
        </View>
      </Card>

      {error && rows ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : isPending || !rows ? (
        <RosterSkeleton />
      ) : (
        <FlatList
          data={data?.players}
          refreshControl={refreshControl}
          keyExtractor={(p) => p.id}
          showsVerticalScrollIndicator={false}
          // The first screenful is built at once; the rest as it is scrolled to.
          initialNumToRender={9}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
          ListHeaderComponent={data?.coach ? <CoachRow coach={data.coach} theme={theme} /> : undefined}
          renderItem={({ item }) => <PlayerRow player={item} theme={theme} onPress={() => openPlayer(item)} />}
        />
      )}
    </View>
  );
}

function CoachRow({ coach, theme }: { coach: string; theme: TeamTheme }) {
  return (
    <View style={[styles.coachRow, { backgroundColor: withAlpha(theme.primary, 0.3) }]}>
      <View style={[styles.coachIcon, { backgroundColor: withAlpha(theme.accent, 0.18) }]}>
        <Text style={[styles.coachInitial, { color: theme.accent }]}>{coach.charAt(0).toUpperCase()}</Text>
      </View>
      <View>
        <Text style={styles.coachLabel}>Head Coach</Text>
        <Text style={styles.coachName}>{coach}</Text>
      </View>
    </View>
  );
}

function PlayerRow({ player, theme, onPress }: { player: Player; theme: TeamTheme; onPress: () => void }) {
  return (
    <View style={[styles.row, { backgroundColor: surfaces.card }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${player.name}, number ${player.jersey ?? 'unknown'}, ${player.positionName ?? ''}`}
        style={({ pressed }) => [styles.rowMain, pressed && { backgroundColor: withAlpha(theme.primary, 0.25) }]}>
        <Text style={[styles.jersey, { color: theme.accent }]}>{player.jersey ?? '–'}</Text>
        <View style={[styles.headshotWrap, { backgroundColor: withAlpha(theme.primary, 0.6) }]}>
          {player.headshot ? (
            <Image source={player.headshot} style={styles.headshot} contentFit="cover" transition={150} />
          ) : (
            <Text style={styles.initials}>
              {player.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[player.position, player.height, player.weight].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View style={styles.chevron}>
          <Text style={{ color: palette.muted, fontSize: 18 }}>›</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bannerBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: withAlpha('#FFFFFF', 0.94),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerLogo: {
    width: 38,
    height: 38,
  },
  bannerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  bannerSub: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  coachIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInitial: {
    fontFamily: fonts.display,
    fontSize: 22,
  },
  coachLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
    marginBottom: 1,
  },
  coachName: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.chalk,
  },
  row: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    paddingRight: 12,
  },
  jersey: {
    width: 44,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 32,
  },
  headshotWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headshot: {
    width: 64,
    height: 52,
  },
  initials: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: palette.chalk,
  },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: palette.chalk,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.muted,
    marginTop: 1,
  },
  chevron: {
    paddingLeft: 4,
  },
});
