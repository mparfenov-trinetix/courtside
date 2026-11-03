import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompareIcon, PeopleIcon, SearchIcon, StarIcon } from '@/components/icons';
import { cardHeight, TeamCard } from '@/components/team-card';
import { NextGame } from '@/components/next-game';
import { ScoresStrip } from '@/components/scores-strip';
import { SeasonSeries } from '@/components/season-series';
import { TeamSeasonStats } from '@/components/team-season-stats';
import { Watchlist } from '@/components/watchlist';
import { IconButton, LoadingState, ScreenHeader } from '@/components/ui';
import { useTeam, useTeamDetail, useTeamSchedule } from '@/hooks/queries';
import { useRefresh } from '@/hooks/use-refresh';
import { useTilt } from '@/hooks/use-tilt';
import type { Game } from '@/lib/espn';
import { fonts, palette, teamTheme, withAlpha } from '@/lib/theme';
import { useTeamStore } from '@/state/team-store';

/**
 * The team card page. As the drawer's "Team card" screen it shows the current team and a menu button;
 * pushed from elsewhere (a game, a leaderboard) it shows any team with a back arrow and swipe-back.
 */
export function TeamHome({ teamId, pushed = false }: { teamId?: string | null; pushed?: boolean }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { currentTeamId, favoriteTeamId, viewTeam } = useTeamStore();
  const team = useTeam(teamId);
  const { data: detail } = useTeamDetail(teamId);
  const { data: schedule } = useTeamSchedule(teamId);
  const theme = teamTheme(team);
  const rival = useTeam(pushed && favoriteTeamId !== teamId ? favoriteTeamId : null);

  const cardWidth = Math.round(Math.min(width * 0.78, 360, (height - insets.top - insets.bottom - 230) / 1.4));
  const tilt = useTilt({ width: cardWidth, height: cardHeight(cardWidth) }, { scrollSafe: true });
  const refreshControl = useRefresh([['team'], ['schedule'], ['leagueTeamStats'], ['scoreboard']]);
  // Destructure shared values so useAnimatedStyle closures don't capture the gesture
  const tiltX = tilt.x;
  const tiltY = tilt.y;

  const bg = useSharedValue<string>(theme.background);
  useEffect(() => {
    bg.value = withTiming(theme.background, { duration: 500 });
  }, [theme.background, bg]);
  const bgStyle = useAnimatedStyle(() => ({ backgroundColor: bg.value }));

  const lettersStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -tiltX.value * 8 }, { translateY: -tiltY.value * 5 }],
  }));

  const completedGames = useMemo(() => {
    if (!schedule) return [];
    return schedule
      .filter((g) => g.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [schedule]);

  const isFavorite = !!team && team.id === favoriteTeamId;

  if (!team) {
    return (
      <View style={[styles.root, { backgroundColor: palette.arena }]}>
        <LoadingState label="Loading your team" />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.root, bgStyle]}>
      <Animated.Text
        key={`letters-${team.id}`}
        entering={FadeIn.duration(600)}
        style={[
          styles.letters,
          { color: withAlpha(theme.accent, 0.09), fontSize: width * 0.62, top: height * 0.2 },
          lettersStyle,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {team.abbreviation}
      </Animated.Text>

      <ScreenHeader
        onBack={pushed ? () => router.back() : undefined}
        right={
          pushed ? (
            team.id === favoriteTeamId ? null : (
              <IconButton
                label={`Compare with ${favoriteTeamId ? 'your team' : 'another team'}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.navigate({
                    pathname: '/compare',
                    params: { mode: 'teams', a: favoriteTeamId ?? currentTeamId ?? '', b: team.id },
                  });
                }}>
                <CompareIcon color={palette.chalk} />
              </IconButton>
            )
          ) : (
            <View style={styles.headerActions}>
              <IconButton label="Search players and teams" onPress={() => router.push('/search')}>
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}>
        {/* Team card */}
        <View style={styles.cardArea}>
          <TeamCard key={team.id} team={team} detail={detail} width={cardWidth} tilt={tilt} />
        </View>

        {/* Team stats row */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.splits}>
          <Split label="Home" value={detail?.homeRecord} />
          <Split label="Away" value={detail?.awayRecord} />
          <Split label="Arena" value={detail?.venue} wide />
        </Animated.View>

        <TeamSeasonStats teamId={team.id} accent={theme.accent} />

        {schedule && schedule.length > 0 && <NextGame schedule={schedule} theme={theme} />}

        {pushed && rival && schedule && <SeasonSeries schedule={schedule} team={team} rival={rival} accent={theme.accent} />}

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

        <Watchlist accent={theme.accent} teamId={team.id} teamAbbr={team.abbreviation} />

        <ScoresStrip accent={theme.accent} highlightTeamId={team.id} />

        {/* Recent games */}
        {completedGames.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.gamesSection}>
            <Text style={[styles.gamesSectionTitle, { color: withAlpha(palette.chalk, 0.55) }]}>
              Recent Games
            </Text>
            {completedGames.map((game, i) => (
              <GameRow key={game.id} game={game} theme={theme} index={i} />
            ))}
          </Animated.View>
        )}
      </ScrollView>
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

function GameRow({ game, theme, index }: { game: Game; theme: ReturnType<typeof teamTheme>; index: number }) {
  const date = new Date(game.date);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const isWin = game.result === 'W';

  return (
    <Animated.View entering={FadeInDown.delay(140 + index * 35).duration(260)}>
      <Pressable
        onPress={() => router.push({ pathname: '/game/[id]', params: { id: game.id } })}
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
  letters: {
    position: 'absolute',
    left: -10,
    right: -10,
    textAlign: 'center',
    fontFamily: 'BigShouldersDisplay_900Black',
  },
  headerActions: { flexDirection: 'row', gap: 8 },
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
    marginBottom: 8,
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
