import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { scrollTo, useAnimatedRef, useAnimatedScrollHandler, useSharedValue, type AnimatedRef, type SharedValue } from 'react-native-reanimated';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronIcon, ErrorState, Card } from '@/components';
import { RosterSkeleton } from './RosterSkeleton';
import { useGridColumns, useRefresh, useRoster, useScale } from '@/hooks';
import type { Player, Team } from '@/lib/espn';
import { fonts, palette, teamTheme, withAlpha, type TeamTheme, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { useTeamStore } from '@/state';
import type { RosterMode } from '../../constants';
import { COLLAPSE_AT } from '../TeamPills';
import { RosterCards } from '../RosterCards';
import { RosterInsights } from '../RosterInsights';

/**
 * One team's roster page: its banner, head coach and players. It has no background of its own: the pager paints
 * the whole screen, header included, in the color of the team being viewed.
 * `active` pages load their data (the visible team and the ones next to it). The rows are built only for `rows` pages
 * (the team the pager last came to rest on and its two neighbours, so a swipe to a neighbour shows real rows at once).
 * Every other page, including each one a long jump scrolls through, shows a skeleton, so no page is ever blank and
 * none has to lay out forty rows of headshots mid-flight. `mode` is the view the Teams screen is in: the list, a swipeable card for each
 * player, or the team's insights (lineups, rankings, makeup, a comparison).
 */
export function TeamRoster({
  team,
  width,
  active,
  rows,
  mode = 'list',
  pageIndex,
  offsets,
}: {
  team: Team;
  width: number;
  active: boolean;
  rows: boolean;
  mode?: RosterMode;
  /** This page's place in the pager, and where every page's list has scrolled to (by place): the strip above reads them to fold itself up. */
  pageIndex?: number;
  offsets?: SharedValue<Record<number, number>>;
}) {
  const insets = useSafeAreaInsets();
  const { columns, itemWidth } = useGridColumns(420);
  const theme = teamTheme(team);
  const { data, isPending, error, refetch } = useRoster(active ? team.id : undefined);
  const refreshControl = useRefresh([['roster', team.id]]);

  // The banner is the way into the team's own page: make it the team being viewed and show its card.
  const viewTeam = useTeamStore((s) => s.viewTeam);
  const openTeam = () => {
    Haptics.selectionAsync();
    viewTeam(team.id);
    router.navigate('/home');
  };

  const openPlayer = (player: Player) => {
    Haptics.selectionAsync();
    openDetail({ pathname: '/player/[id]', params: { id: player.id, teamId: team.id } });
  };

  // Where this page's list has scrolled to, for the strip above (a page that goes away or starts again counts as not scrolled). A scroll that comes to
  // rest while the banner is half gone and the strip half folded is finished for you, as on the game page: back to the top, or on to the folded strip.
  const listRef = useAnimatedRef<Animated.FlatList<Player>>();
  const insightsRef = useAnimatedRef<Animated.ScrollView>();
  const flick = useSharedValue(0);
  const settle = (y: number, velocity: number) => {
    'worklet';
    if (y <= 1 || y >= COLLAPSE_AT - 1) return;
    const down = Math.abs(velocity) > 0.25 ? velocity > 0 : y > COLLAPSE_AT / 2;
    scrollTo((mode === 'insights' ? insightsRef : listRef) as unknown as AnimatedRef<Animated.ScrollView>, 0, down ? COLLAPSE_AT : 0, true);
  };
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      if (!offsets || pageIndex == null) return;
      offsets.modify((v) => {
        'worklet';
        v[pageIndex] = e.contentOffset.y;
        return v;
      });
    },
    onEndDrag: (e) => {
      const v = e.velocity?.y ?? 0;
      flick.set(v);
      // With momentum still to come, wait for it to finish (it keeps the flick's direction); without any, settle now.
      if (Math.abs(v) < 0.05) settle(e.contentOffset.y, 0);
    },
    onMomentumEnd: (e) => {
      settle(e.contentOffset.y, flick.get());
    },
  });
  useEffect(() => {
    if (!offsets || pageIndex == null) return;
    const clear = () => offsets.modify((v) => {
      'worklet';
      delete v[pageIndex];
      return v;
    });
    clear();
    return clear;
  }, [offsets, pageIndex, mode]);

  // The banner is the head of the list or of the insights, so it scrolls away with them; where nothing scrolls (loading, an error, the cards) it stays on top.
  const scrolls = !error && !isPending && rows && (mode === 'insights' || mode === 'list') && !!data;
  const banner = (
    <View style={scrolls ? styles.bannerIn : styles.bannerFixed}>
      <Pressable
        onPress={openTeam}
        accessibilityRole="button"
        accessibilityLabel={`${team.displayName}, open the team page`}
        style={({ pressed }) => pressed && { opacity: 0.85 }}>
        <Card team={theme} padded={false} radius={18} style={styles.banner}>
          {/* On a light disc, so a logo that shares the team's color (Houston's red) never disappears into the banner. */}
          <View style={styles.bannerBadge}>
            <Image source={team.logo} style={styles.bannerLogo} contentFit="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: theme.onPrimary }]}>{team.displayName}</Text>
            <Text style={[styles.bannerSub, { color: withAlpha(theme.onPrimary, 0.75) }]}>
              {data ? `${data.players.length} players · Team page` : ' '}
            </Text>
          </View>
          <ChevronIcon color={withAlpha(theme.onPrimary, 0.75)} />
        </Card>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.page, { width }]}>
      {scrolls ? null : banner}

      {error && rows ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : isPending || !rows ? (
        <RosterSkeleton />
      ) : mode === 'cards' && data ? (
        <RosterCards players={data.players} team={team} theme={theme} />
      ) : mode === 'insights' && data ? (
        <RosterInsights players={data.players} team={team} theme={theme} header={banner} onScroll={onScroll} scrollRef={insightsRef} />
      ) : (
        <Animated.FlatList
          ref={listRef}
          data={data?.players}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={refreshControl}
          keyExtractor={(p) => p.id}
          showsVerticalScrollIndicator={false}
          // The first screenful is built at once; the rest as it is scrolled to.
          initialNumToRender={9}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          // Two or three columns of players on an iPad or a Mac window.
          key={columns}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? { gap: 8 } : undefined}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
          ListHeaderComponent={
            <>
              {banner}
              {data?.coach ? <CoachRow coach={data.coach} theme={theme} /> : null}
            </>
          }
          renderItem={({ item }) => (
            <View style={columns > 1 ? { width: itemWidth } : undefined}>
              <PlayerRow player={item} theme={theme} onPress={() => openPlayer(item)} />
            </View>
          )}
        />
      )}

      {/* The rows slide under the strip, so their top edge fades into the page instead of being cut off along it. */}
      {scrolls ? (
        <LinearGradient pointerEvents="none" colors={[theme.background, withAlpha(theme.background, 0)]} style={styles.edge} />
      ) : null}
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
  // 1 on a phone; an iPad or a Mac window draws the jersey, the photo and the name bigger.
  const k = useScale();
  return (
    <View style={[styles.row, { backgroundColor: surfaces.card }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${player.name}, number ${player.jersey ?? 'unknown'}, ${player.positionName ?? ''}`}
        style={({ pressed }) => [styles.rowMain, pressed && { backgroundColor: withAlpha(theme.primary, 0.25) }]}>
        <Text style={[styles.jersey, k > 1 && { width: 44 * k, fontSize: 32 * k }, { color: theme.accent }]}>{player.jersey ?? '–'}</Text>
        <View style={[styles.headshotWrap, k > 1 && { width: 52 * k, height: 52 * k, borderRadius: 26 * k }, { backgroundColor: withAlpha(theme.primary, 0.6) }]}>
          {player.headshot ? (
            <Image source={player.headshot} style={[styles.headshot, k > 1 && { width: 64 * k, height: 52 * k }]} contentFit="cover" transition={150} />
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
          <Text style={[styles.name, k > 1 && { fontSize: 17 * k }]} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={[styles.meta, k > 1 && { fontSize: 13 * k }]} numberOfLines={1}>
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
  // The banner on top of a page that does not scroll sits 16 in from the sides; at the head of a list or the insights, whose own padding is 16, it fills the width.
  edge: { position: 'absolute', top: 0, left: 0, right: 0, height: 22 },
  bannerFixed: { marginHorizontal: 16, marginTop: 14, marginBottom: 6 },
  bannerIn: { marginBottom: 8 },
  banner: {
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
