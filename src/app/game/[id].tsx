import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoxScoreTab } from '@/components/game/box-score-tab';
import { PlayByPlay } from '@/components/game/play-by-play';
import { GameTopBar, ScoreHero } from '@/components/game/score-hero';
import { ShotChart } from '@/components/game/shot-chart';
import { GameStickyBar, type GameTab } from '@/components/game/sticky-bar';
import { SummaryTab } from '@/components/game/summary-tab';
import { slideIn } from '@/components/segmented';
import { ErrorState, LoadingState } from '@/components/ui';
import { useGameSummary } from '@/hooks/queries';
import { useRefresh } from '@/hooks/use-refresh';
import type { BoxScorePlayer, BoxScoreTeam } from '@/lib/espn';
import {
  buildPeriodOptions,
  deriveFlow,
  numsFromLine,
  numsFromTotals,
  playersWithStats,
} from '@/lib/game-model';
import { deriveQuarterStats, emptyLine, lineToStats, sumPeriods, type Line, type QuarterStats } from '@/lib/quarter-stats';
import { matchupColors, palette, withAlpha } from '@/lib/theme';

const TAB_ORDER: GameTab[] = ['summary', 'box', 'plays', 'shots'];

/**
 * Game page. A slim top bar always shows the score; the big header scrolls away; a pinned
 * tab bar switches between a glanceable Summary, the Box score, Plays and Shots.
 */
export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch, dataUpdatedAt } = useGameSummary(id);
  const refreshControl = useRefresh([['game', id]]);
  const [tab, setTab] = useState<GameTab>('summary');
  const [slide, setSlide] = useState<1 | -1>(1);
  const [periodKey, setPeriodKey] = useState('full');

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  if (isPending) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <LoadingState label="Loading game" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ErrorState message={error?.message ?? 'Failed to load game'} onRetry={refetch} />
      </View>
    );
  }

  const { home, away, status, completed, live, plays, winProb, info } = data;
  const { home: homeColor, away: awayColor } = matchupColors(away.team, home.team);
  const hasStarted = completed || live || plays.length > 0;
  const tabbed = hasStarted && plays.length > 0;

  const derived: QuarterStats | null =
    plays.length > 0
      ? deriveQuarterStats(
          plays,
          [
            { teamId: away.team.id, starterIds: away.starters.map((p) => p.id) },
            { teamId: home.team.id, starterIds: home.starters.map((p) => p.id) },
          ],
          home.team.id,
        )
      : null;

  const flow = deriveFlow(plays, home.team.id, away.team.id);

  const periodCount = Math.max(home.linescores.length, away.linescores.length, derived?.periods.length ?? 0);
  const options = buildPeriodOptions(derived ? periodCount : 0);
  const option = options.find((o) => o.key === periodKey) ?? options[0];
  const selPeriods = option.periods;
  const filtered = selPeriods != null;

  const awayPlayers = playersWithStats(away, derived, selPeriods);
  const homePlayers = playersWithStats(home, derived, selPeriods);

  const sumLine = (teamId: string): Line =>
    derived && selPeriods ? sumPeriods(derived.teams, selPeriods, teamId) : emptyLine();
  const awayNums = filtered ? numsFromLine(sumLine(away.team.id)) : numsFromTotals(away.totals);
  const homeNums = filtered ? numsFromLine(sumLine(home.team.id)) : numsFromTotals(home.totals);

  const totalsFor = (t: BoxScoreTeam, players: BoxScorePlayer[]): Record<string, string> => {
    if (!filtered) return t.totals;
    const mins = players.reduce(
      (acc, p) => acc + (derived && selPeriods ? sumPeriods(derived.players, selPeriods, p.id).sec : 0),
      0,
    );
    return { ...lineToStats(sumLine(t.team.id)), MIN: String(Math.round(mins / 60)), '+/-': '–' };
  };

  const qScore = (t: BoxScoreTeam) =>
    selPeriods ? selPeriods.reduce((acc, n) => acc + (t.linescores[n - 1] ?? 0), 0) : t.score;

  const changeTab = (next: GameTab) => {
    setSlide(TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? 1 : -1);
    setTab(next);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(awayColor, 0.34), withAlpha(homeColor, 0.34)]}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 1, y: 0.6 }}
        style={styles.heroTint}
      />
      <LinearGradient pointerEvents="none" colors={['rgba(13,27,46,0)', palette.arena]} style={styles.heroTint} />

      <GameTopBar
        scrollY={scrollY}
        away={away}
        home={home}
        status={status}
        live={live}
        hasStarted={hasStarted}
        updatedAt={dataUpdatedAt}
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={refreshControl}
        stickyHeaderIndices={tabbed ? [1] : undefined}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <ScoreHero
          away={away}
          home={home}
          status={status}
          live={live}
          completed={completed}
          hasStarted={hasStarted}
          periodCount={periodCount}
          selPeriods={selPeriods}
        />

        {/* A plain View: ScrollView replaces the style of a sticky child, so the bar styles itself. */}
        <View>
          {tabbed && (
            <GameStickyBar
              tab={tab}
              onTab={changeTab}
              accent={homeColor}
              options={options}
              optionKey={option.key}
              onOption={setPeriodKey}
              periodScore={
                filtered
                  ? { away: [away.team.abbreviation, qScore(away)], home: [home.team.abbreviation, qScore(home)] }
                  : null
              }
            />
          )}
        </View>

        <Animated.View key={tab} entering={slideIn(slide)} style={styles.content}>
          {tab === 'summary' || !tabbed ? (
            <SummaryTab
              away={away}
              home={home}
              awayColor={awayColor}
              homeColor={homeColor}
              awayPlayers={awayPlayers}
              homePlayers={homePlayers}
              awayNums={awayNums}
              homeNums={homeNums}
              plays={plays}
              winProb={winProb}
              flow={flow}
              info={info}
              live={live}
              hasStarted={hasStarted}
              selPeriods={selPeriods}
              periodNote={filtered ? `${option.label} · from play-by-play` : undefined}
            />
          ) : tab === 'box' ? (
            <BoxScoreTab
              away={away}
              home={home}
              awayPlayers={awayPlayers}
              homePlayers={homePlayers}
              totals={{ away: totalsFor(away, awayPlayers), home: totalsFor(home, homePlayers) }}
              filtered={filtered}
              periodLabel={option.label}
              hasStarted={hasStarted}
              derived={derived}
              selPeriods={selPeriods}
            />
          ) : tab === 'plays' ? (
            <PlayByPlay
              key={option.key}
              plays={plays}
              periods={selPeriods}
              home={home}
              away={away}
              homeColor={homeColor}
              awayColor={awayColor}
            />
          ) : (
            <ShotChart
              plays={plays}
              periods={selPeriods}
              away={away}
              home={home}
              awayColor={awayColor}
              homeColor={homeColor}
            />
          )}
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.arena },
  heroTint: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
  content: { paddingTop: 12 },
});
