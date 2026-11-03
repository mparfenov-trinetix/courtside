import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoxScoreTab, GameSkeleton, PlayByPlay, GameTopBar, ScoreHero, ShotChart, SummaryTab, GameStickyBar, type GameTab } from '../../components';
import { ArrowLeftIcon, IconButton, slideIn, ErrorState } from '@/components';
import { useGameSummary , useRefresh } from '@/hooks';
import type { BoxScorePlayer, BoxScoreTeam } from '@/lib/espn';
import { buildPeriodOptions, deriveFlow, numsFromLine, numsFromTotals, playersWithStats, deriveQuarterStats, emptyLine, lineToStats, sumPeriods, type Line, type QuarterStats } from '@/lib/game';
import { matchupColors, mix, palette, withAlpha } from '@/lib/theme';

const TAB_ORDER: GameTab[] = ['summary', 'box', 'plays', 'shots'];

/**
 * Game page. A slim top bar always shows the score; the big header scrolls away; a pinned
 * tab bar switches between a glanceable Summary, the Box score, Plays and Shots.
 */
export function GameScreen() {
  const insets = useSafeAreaInsets();
  const { id, o } = useLocalSearchParams<{ id: string; o?: string }>();
  const { data, isPending, error, refetch, dataUpdatedAt } = useGameSummary(id);
  const refreshControl = useRefresh([['game', id]]);
  const [tab, setTab] = useState<GameTab>('summary');
  const [slide, setSlide] = useState<1 | -1>(1);
  const [periodKey, setPeriodKey] = useState('full');

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  // Where the tab bar sits in the page. It pins once the scroll reaches that point; `pinned` ramps 0 -> 1
  // over the last stretch before, so the bars' team-colored surface arrives exactly as they take over
  // from the page's big colored wash, with no band in between.
  const stickyY = useSharedValue(330);
  // Tied to the scroll (not eased): content slides under the bars the moment they pin, so they must be opaque by then.
  // The bars match the page's wash, so this never reads as a jump.
  const pinned = useDerivedValue(() =>
    interpolate(scrollY.get(), [stickyY.get() - 70, stickyY.get() - 8], [0, 1], Extrapolation.CLAMP),
  );
  // Eased in time rather than tied to the finger: a fast flick would otherwise snap the compact score in a frame or two.
  // 1 once the big score has scrolled away and the compact one in the top bar takes over.
  const collapsed = useDerivedValue<number>(() =>
    withTiming(scrollY.get() > 90 ? 1 : 0, { duration: 300, easing: Easing.out(Easing.cubic) }),
  );
  const heroTintStyle = useAnimatedStyle(() => ({ opacity: 1 - pinned.get() }));
  // A soft shadow under the top bar once content has scrolled beneath it (the tab bar carries its own when pinned).
  const edgeStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.get(), [0, 24], [0, 1], Extrapolation.CLAMP) }));

  if (isPending) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <GameSkeleton />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={[styles.errorBack, { top: insets.top + 8 }]}>
          <IconButton onPress={() => router.back()} label="Go back">
            <ArrowLeftIcon color={palette.chalk} size={20} />
          </IconButton>
        </View>
        <ErrorState message={error?.message ?? 'Failed to load game'} onRetry={refetch} />
      </View>
    );
  }

  const { home, away, status, completed, live, plays, winProb, info } = data;
  const { home: homeColor, away: awayColor } = matchupColors(away.team, home.team);
  const hasStarted = completed || live || plays.length > 0;
  const tabbed = hasStarted && plays.length > 0;
  // The page takes on the two teams: a deep base mixed from both colors, washed by a gradient from one to the other.
  const base = mix(palette.arena, mix(awayColor, homeColor, 0.5), 0.1);
  // The pinned bars are opaque, in the same colors the page wash has at the top, so they read as part of the page.
  const tint: [string, string] = [mix(base, awayColor, 0.2), mix(base, homeColor, 0.2)];

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

  const changeTab = (next: GameTab) => {
    setSlide(TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? 1 : -1);
    setTab(next);
  };

  return (
    <View style={[styles.root, { backgroundColor: base }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(awayColor, 0.2), withAlpha(homeColor, 0.2)]}
        start={{ x: 0, y: 0.15 }}
        end={{ x: 1, y: 0.95 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[styles.heroTint, heroTintStyle]}>
        <LinearGradient
          colors={[withAlpha(awayColor, 0.34), withAlpha(homeColor, 0.34)]}
          start={{ x: 0, y: 0.4 }}
          end={{ x: 1, y: 0.6 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[withAlpha(base, 0), withAlpha(base, 0.78)]}
          locations={[0, 0.42]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <GameTopBar
        collapsed={collapsed}
        away={away}
        home={home}
        status={status}
        live={live}
        hasStarted={hasStarted}
        updatedAt={dataUpdatedAt}
        cup={data.cup}
        tint={tint}
        pinned={pinned}
      />

      <View style={{ flex: 1 }}>
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
          gameId={id}
          origin={o}
        />

        {/* A plain View: ScrollView replaces the style of a sticky child, so the bar styles itself. */}
        <View onLayout={(e) => stickyY.set(e.nativeEvent.layout.y)}>
          {tabbed && (
            <GameStickyBar
              tab={tab}
              onTab={changeTab}
              accent={homeColor}
              options={options}
              optionKey={option.key}
              onOption={setPeriodKey}
              pinned={pinned}
              tint={tint}
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
              pregame={data.pregame}
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
              background={mix(base, awayColor, 0.14)}
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
      {!tabbed && (
        <Animated.View pointerEvents="none" style={[styles.edge, edgeStyle]}>
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.arena },
  heroTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: { paddingTop: 12 },
  edge: { position: 'absolute', top: 0, left: 0, right: 0, height: 16 },
  errorBack: { position: 'absolute', left: 16, zIndex: 1 },
});
