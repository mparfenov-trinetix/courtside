import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { scheduleOnRN } from 'react-native-worklets';
import Animated, { Easing, useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TeamMark , CalendarIcon, CompareIcon, PeopleIcon, SearchIcon, StarIcon , IconButton, ScreenHeader, Skeleton, SkeletonGroup, TITLE_INSET, headerHeight } from '@/components';
import { MyCupCard } from '@/features/cup';
import { NextGame } from '../NextGame';
import { ScoresStrip } from '../ScoresStrip';
import { TeamSwitcher } from '../TeamSwitcher';
import { SeasonSeries } from '../SeasonSeries';
import { goBack, sharedTag, openDetail, pushOnce } from '@/navigation';
import { CatchUp } from '../CatchUp';
import { cardHeight, TeamCard } from '../TeamCard';
import { motionOf, PULL_TO_REFRESH, useRefreshAnimation } from '../TeamRefresh';
import { TeamHighlights } from '../TeamHighlights';
import { TeamSeasonStats } from '../TeamSeasonStats';
import { Watchlist } from '@/features/watchlist';
import { useManualRefresh, useStandings, useTeam, useTeamDetail, useTeamSchedule, useTilt } from '@/hooks';
import { conferenceStanding } from '@/lib/league';
import type { Game } from '@/lib/espn';
import { fonts, palette, teamTheme, withAlpha } from '@/lib/theme';
import { useTeamStore } from '@/state';

/**
 * The team card page. As the drawer's "Team card" screen it shows the current team and a menu button;
 * pushed from elsewhere (a game, a leaderboard) it shows any team with a back arrow and swipe-back.
 */
// The refresh animation is worth seeing through a few dribbles, even when the data is back sooner.
const REFRESH_MIN_MS = 2400;

export function TeamHome({ teamId, pushed = false, origin }: { teamId?: string | null; pushed?: boolean; origin?: string }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { currentTeamId, favoriteTeamId, viewTeam } = useTeamStore();
  const [switching, setSwitching] = useState(false);
  const team = useTeam(teamId);
  const { data: detail } = useTeamDetail(teamId);
  const { data: schedule } = useTeamSchedule(teamId);
  const { data: standings } = useStandings();
  const standing = conferenceStanding(standings, teamId);
  const theme = teamTheme(team);
  const rival = useTeam(pushed && favoriteTeamId !== teamId ? favoriteTeamId : null);

  const cardWidth = Math.round(Math.min(width * 0.78, 360, (height - insets.top - insets.bottom - 230) / 1.4));
  const tilt = useTilt({ width: cardWidth, height: cardHeight(cardWidth) }, { scrollSafe: true });
  // Pull the page down past the threshold and let go: the card plays the team's own refresh (see TeamRefresh/motions.ts).
  const { refreshing, refresh } = useManualRefresh([['team', teamId], ['schedule', teamId], ['standings'], ['leagueTeamStats'], ['scoreboard']], REFRESH_MIN_MS);

  // The header is empty while the card is on screen; once it has scrolled away the team's name takes over.
  const scrollY = useSharedValue(0);
  // The title comes in once the card is mostly gone and goes out only when you are back almost at the top, so
  // scrolling up doesn't make it vanish while the card is still half off screen. Both ease in time.
  const titleShown = useSharedValue(0);
  const cardH = cardHeight(cardWidth);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.set(e.contentOffset.y);
      if (e.contentOffset.y > cardH * 0.7) titleShown.set(1);
      else if (e.contentOffset.y < cardH * 0.1) titleShown.set(0);
    },
    onEndDrag: (e) => {
      if (e.contentOffset.y < -PULL_TO_REFRESH) scheduleOnRN(refresh);
    },
  });
  const refreshAnimation = useRefreshAnimation({ refreshing, scrollY, motion: motionOf(team?.abbreviation ?? '') });
  const titleProgress = useDerivedValue(() => withTiming(titleShown.get(), { duration: 260, easing: Easing.out(Easing.cubic) }));
  // The drawer's "Team card" screen is reused for every team, so a new team must start at the top.
  // Keying the ScrollView remounts it at offset 0; the shared value is reset to match.
  useEffect(() => {
    scrollY.set(0);
    titleShown.set(0);
  }, [teamId, scrollY, titleShown]);
  const headerFill = useAnimatedStyle(() => ({ opacity: titleProgress.get() }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleProgress.get(),
    transform: [{ translateY: (1 - titleProgress.get()) * 8 }],
  }));

  const bg = useSharedValue<string>(theme.background);
  useEffect(() => {
    bg.value = withTiming(theme.background, { duration: 500 });
  }, [theme.background, bg]);
  const bgStyle = useAnimatedStyle(() => ({ backgroundColor: bg.value }));

  const completedGames = useMemo(() => {
    if (!schedule) return [];
    return schedule
      .filter((g) => g.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [schedule]);

  const isFavorite = !!team && team.id === favoriteTeamId;
  // Choosing another team shows its card and header at once; the sections below it are built in a second, interruptible
  // pass, so the switch doesn't wait for (or stutter on) the whole page.
  const settled = useDeferredValue(team?.id, undefined);
  const lower = !!team && settled === team.id;

  if (!team) {
    return (
      <View style={[styles.root, { backgroundColor: palette.arena, paddingTop: insets.top + 12 }]}>
        <SkeletonGroup style={{ paddingHorizontal: 20, gap: 18 }}>
          <Skeleton width={44} height={44} radius={22} />
          <Skeleton height={320} radius={28} />
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Skeleton width={70} height={34} />
            <Skeleton width={70} height={34} />
            <Skeleton width={150} height={34} />
          </View>
          <Skeleton height={150} radius={18} />
        </SkeletonGroup>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.root, bgStyle]}>
      {/* Over the page, see-through while the card is on screen (it tilts, and its top edge must not be cut off by a
          bar), and filling in with the page color once you scroll so content doesn't run under the buttons. */}
      <View style={[styles.headerWrap, { height: headerHeight(insets.top) }]} pointerEvents="box-none">
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, bgStyle, headerFill]} />
      <ScreenHeader
        onBack={pushed ? goBack : undefined}
        // Calendar is one of the two main screens: one tap from the Team card, next to the menu.
        afterMenu={
          pushed ? undefined : (
            <IconButton label="Open the calendar" onPress={() => router.navigate('/calendar')}>
              <CalendarIcon color={palette.chalk} />
            </IconButton>
          )
        }
        centerTitle
        title={
          <Animated.View style={[styles.headerTitle, titleStyle]} pointerEvents="none">
            <TeamMark team={team} maxWidth={width - 2 * TITLE_INSET} />
          </Animated.View>
        }
        right={
          pushed ? (
            team.id === favoriteTeamId ? null : (
              <IconButton
                label={`Compare with ${favoriteTeamId ? 'your team' : 'another team'}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  pushOnce({
                    pathname: '/matchup-compare',
                    params: { mode: 'teams', a: favoriteTeamId ?? currentTeamId ?? '', b: team.id },
                  });
                }}>
                <CompareIcon color={palette.chalk} />
              </IconButton>
            )
          ) : (
            <View style={styles.headerActions}>
              <IconButton label="Search players and teams" onPress={() => pushOnce('/search')}>
                <SearchIcon color={palette.chalk} />
              </IconButton>
              <IconButton
                label="Change favorite team"
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/onboarding');
                }}>
                <StarIcon color={isFavorite ? theme.accent : palette.chalk} filled={isFavorite} />
              </IconButton>
            </View>
          )
        }
      />
      </View>

      <Animated.ScrollView
        key={team.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight(insets.top), paddingBottom: insets.bottom + 32 }]}>
        {/* Team card */}
        <View style={styles.cardArea}>
          {pushed ? (
            <TeamCard key={team.id} team={team} detail={detail} standing={standing} width={cardWidth} tilt={tilt} refresh={refreshAnimation} logoTag={sharedTag(origin, 'team', team.id, 'logo')} />
          ) : (
            // Hold the card to switch team. A drag tilts it instead (the gesture takes over before the hold completes).
            <Pressable
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSwitching(true);
              }}
              delayLongPress={420}
              accessibilityHint="Hold to switch team">
              <TeamCard key={team.id} team={team} detail={detail} standing={standing} width={cardWidth} tilt={tilt} refresh={refreshAnimation} logoTag={sharedTag(origin, 'team', team.id, 'logo')} />
            </Pressable>
          )}
        </View>

        {lower && (
          <>
        {/* What happened while the app was closed (own team only). */}
        {team.id === favoriteTeamId && <CatchUp teamId={team.id} schedule={schedule} accent={theme.accent} />}

        {/* Team stats row */}
        <Animated.View style={styles.splits}>
          <Split label="Home" value={detail?.homeRecord} />
          <Split label="Away" value={detail?.awayRecord} />
          <Split label="Arena" value={detail?.venue} wide />
        </Animated.View>

        {/* What is coming first, then what is on today, then how the team has been doing; the season numbers come after. */}
        {schedule && schedule.length > 0 && <NextGame schedule={schedule} theme={theme} />}

        <ScoresStrip accent={theme.accent} highlightTeamId={team.id} />

        <MyCupCard teamId={team.id} />

        {pushed && rival && schedule && <SeasonSeries schedule={schedule} team={team} rival={rival} accent={theme.accent} />}

        {/* Recent games */}
        {completedGames.length > 0 && (
          <Animated.View style={styles.gamesSection}>
            <Text style={[styles.gamesSectionTitle, { color: withAlpha(palette.chalk, 0.55) }]}>
              Recent Games
            </Text>
            {completedGames.map((game, i) => (
              <GameRow key={game.id} game={game} index={i} />
            ))}
          </Animated.View>
        )}

        <TeamHighlights games={completedGames} accent={theme.accent} />

        <TeamSeasonStats teamId={team.id} accent={theme.accent} />

        <Watchlist accent={theme.accent} teamId={team.id} teamAbbr={team.abbreviation} />

        {/* Roster button */}
        <Pressable
          onPress={() => {
            // The roster screen follows the "current" team, so make this one current first.
            if (team.id !== currentTeamId) viewTeam(team.id);
            router.navigate('/roster');
          }}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.rosterButton,
            { backgroundColor: withAlpha('#FFFFFF', pressed ? 0.16 : 0.09), borderColor: withAlpha(theme.accent, 0.4) },
          ]}>
          <PeopleIcon color={palette.chalk} />
          <Text style={styles.rosterText}>See the roster</Text>
        </Pressable>

        {!tilt.sensorAvailable && (
          <Text style={styles.hint}>No motion sensor found. Drag the card to tilt it.</Text>
        )}
          </>
        )}
      </Animated.ScrollView>
      <TeamSwitcher visible={switching} onClose={() => setSwitching(false)} />
    </Animated.View>
  );
}

function Split({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  return (
    <View style={wide ? { flex: 1 } : undefined}>
      <Text style={styles.splitLabel}>{label}</Text>
      <Text style={styles.splitValue} numberOfLines={1}>
        {value ?? '–'}
      </Text>
    </View>
  );
}

function GameRow({ game, index }: { game: Game; index: number }) {
  const date = new Date(game.date);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const isWin = game.result === 'W';

  return (
    <Animated.View>
      <Pressable
        onPress={() => openDetail({ pathname: '/game/[id]', params: { id: game.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${game.result} vs ${game.opponent}`}
        style={({ pressed }) => [styles.gameRow, pressed && { opacity: 0.75 }]}>
        {/* Result badge */}
        <View
          style={[
            styles.resultBadge,
            { backgroundColor: isWin ? withAlpha('#34D399', 0.15) : withAlpha('#F87171', 0.15) },
          ]}>
          <Text style={[styles.resultLetter, { color: isWin ? '#34D399' : '#F87171' }]}>
            {game.result}
          </Text>
          <Text style={[styles.resultScore, { color: palette.chalk }]}>
            {game.teamScore}–{game.opponentScore}
          </Text>
        </View>

        {/* Opponent */}
        <View style={styles.gameOpponent}>
          {game.opponentLogo ? (
            <Image source={game.opponentLogo} style={styles.oppLogo} contentFit="contain" />
          ) : (
            <View style={[styles.oppLogo, { backgroundColor: withAlpha(palette.chalk, 0.1), borderRadius: 14 }]} />
          )}
          <View>
            <Text style={styles.oppName} numberOfLines={1}>{game.opponent}</Text>
            <Text style={styles.gameLocation}>{game.home ? 'Home' : 'Away'} · {dateStr}</Text>
          </View>
        </View>

        {/* Chevron hint */}
        <Text style={[styles.chevron, { color: withAlpha(palette.chalk, 0.25) }]}>›</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  // The source image is square with the lettering centered, so it is drawn square and the empty space trimmed with margins.
  headerWordmark: { width: 150, height: 150, marginVertical: -56 },
  scrollContent: {
    gap: 0,
  },
  cardArea: {
    alignItems: 'center',
    paddingBottom: 12,
    paddingTop: 4,
  },
  splits: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  splitLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
  },
  splitValue: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: palette.chalk,
  },
  rosterButton: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    marginHorizontal: 24,
    marginVertical: 8,
  },
  rosterText: {
    fontFamily: fonts.bodySemi,
    fontSize: 17,
    color: palette.chalk,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 4,
  },
  gamesSection: {
    marginTop: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  gamesSectionTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: withAlpha('#FFFFFF', 0.05),
    gap: 12,
  },
  resultBadge: {
    width: 70,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    gap: 1,
  },
  resultLetter: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  resultScore: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  gameOpponent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  oppLogo: {
    width: 36,
    height: 36,
  },
  oppName: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: palette.chalk,
  },
  gameLocation: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.muted,
    marginTop: 1,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 26,
  },
});
