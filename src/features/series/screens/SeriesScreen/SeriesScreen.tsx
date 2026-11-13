import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ARRIVE, EmptyState, ErrorState, Glide, ListSkeleton, ScreenHeader, SectionLabel } from '@/components';
import { GameCard } from '@/features/calendar';
import { KeyMatchupView } from '@/features/game';
import { useGameSummaries, useTeams } from '@/hooks';
import { teamAsItWas, type GameSummary, type ScoreboardGame, type Team } from '@/lib/espn';
import { bestPerformances, seriesLeader, type SeriesGame, type SeriesLeader } from '@/lib/league';
import { fonts, fontSize, palette, space } from '@/lib/theme';
import { goBack } from '@/navigation';
import { SeriesHeaderTitle, SeriesHero, SeriesPerformances } from '../../components';
import { useSeries } from './useSeries';

const day = (iso: string) => new Date(iso.replace(/T(\d\d:\d\d)Z$/, 'T$1:00Z')).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** A game of the series as the Calendar's game card wants it. */
function asScoreboard(g: SeriesGame): ScoreboardGame {
  const side = (s: SeriesGame['home']) => ({ teamId: s.teamId, name: s.abbr, abbreviation: s.abbr, logo: s.logo, score: s.score, winner: g.winnerId === s.teamId });
  return { id: g.id, date: g.date, status: g.completed ? 'Final' : '', completed: g.completed, inProgress: false, home: side(g.home), away: side(g.away), kind: 'playoffs' };
}

const starOf = (l: SeriesLeader) => ({ athleteId: l.athleteId, name: l.name, headshot: l.headshot, position: l.position, jersey: l.jersey, ppg: l.ppg, rpg: l.rpg, apg: l.apg });

/**
 * One playoff series as a page of its own, pushed over the bracket, so a game opened from here has this page to come back to (the bottom sheet
 * it replaces was closed before the game opened, and back landed on the bracket). The matchup and where it stands, the two sides' best players
 * over the series face to face, the best single-game lines, and every game as the Calendar's game card, a tap opening it. The top bar stays
 * empty over the big score and takes the two logos and the score once it has scrolled away. `season` finds the series again by `id` in the
 * bracket's own cached data. The play-in and the Cup's knockout are single games: their cards open the game, not this page.
 */
export function SeriesScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ season?: string; id?: string }>();
  const season = Number(params.season) || 0;
  const { series, isPending, error, refetch } = useSeries(season, String(params.id ?? ''));
  const { data: teams } = useTeams();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  const finishedIds = useMemo(() => (series?.games ?? []).filter((g) => g.completed).map((g) => g.id), [series]);
  const summaries = useGameSummaries(finishedIds, finishedIds.length > 0);
  const loaded = summaries.map((q) => q.data).filter((d): d is GameSummary => !!d);
  const ready = finishedIds.length > 0 && loaded.length === finishedIds.length;

  const topLeader = useMemo(() => (series && ready ? seriesLeader(loaded, series.top.teamId) : null), [series, ready, loaded]);
  const bottomLeader = useMemo(() => (series && ready ? seriesLeader(loaded, series.bottom.teamId) : null), [series, ready, loaded]);
  const performances = useMemo(() => (ready ? bestPerformances(loaded, 3) : []), [ready, loaded]);

  const teamOf = (id: string): Team | undefined => {
    const t = teams?.find((x) => x.id === id);
    return t ? teamAsItWas(t, season) : undefined;
  };

  let body;
  if (isPending) body = <ListSkeleton count={5} avatar="square" />;
  else if (error) body = <ErrorState message={error.message} onRetry={refetch} />;
  else if (!series) body = <EmptyState title="Series not found" text="ESPN no longer lists this series." placement="center" />;
  else {
    const labels = new Map(series.games.map((g) => [g.id, g.label]));
    const topTeam = teamOf(series.top.teamId);
    const bottomTeam = teamOf(series.bottom.teamId);
    body = (
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <SeriesHero series={series} top={{ score: series.topWins }} bottom={{ score: series.bottomWins }} />

        {/* The two best players over the series face to face, and the best nights: they arrive once the games' box scores have, and what is under them glides down. */}
        <Glide>
          {topLeader && bottomLeader && topTeam && bottomTeam ? (
            <Animated.View entering={ARRIVE}>
              <KeyMatchupView title="Series leaders" section season={season} away={{ team: topTeam, star: starOf(topLeader) }} home={{ team: bottomTeam, star: starOf(bottomLeader) }} />
            </Animated.View>
          ) : null}
        </Glide>
        <Glide>
          {performances.length > 0 ? (
            <Animated.View entering={ARRIVE}>
              <SeriesPerformances lines={performances} labelOf={(id) => labels.get(id) ?? 'Game'} abbrOf={(id) => (id === series.top.teamId ? series.top.abbr : series.bottom.abbr)} />
            </Animated.View>
          ) : null}
        </Glide>

        <Glide style={styles.games}>
          <SectionLabel>{series.games.length === 1 ? 'Game' : 'Games'}</SectionLabel>
          {series.games.map((g) => (
            <View key={g.id} style={styles.game}>
              <Text style={styles.gameLabel}>
                {g.label} · {day(g.date)}
              </Text>
              <GameCard game={asScoreboard(g)} mine={false} accent={palette.maple} teams={teams} />
            </View>
          ))}
        </Glide>
      </Animated.ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        onBack={goBack}
        centerTitle
        title={series ? <SeriesHeaderTitle top={{ ...series.top, score: series.topWins }} bottom={{ ...series.bottom, score: series.bottomWins }} scrollY={scrollY} /> : undefined}
        color={palette.chalk}
      />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.arena },
  games: { paddingHorizontal: space.lg, gap: space.sm },
  game: { gap: space.xs },
  gameLabel: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.muted, marginTop: space.xs },
});
