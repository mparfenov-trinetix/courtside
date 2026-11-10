import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoxScoreTab, GameBackdrop, GameLogos, GameSkeleton, HERO_INSET, backdropColors, PlayByPlay, GameTopBar, ScoreHero, ShotChart, SummaryTab, GameStickyBar, type GameTab, type LogoSlot } from '../../components';
import { ArrowLeftIcon, IconButton, slideIn, ErrorState } from '@/components';
import { playoffTag } from '@/lib/league';
import { useGameSummary, useGameTeams, useHeadToHead, usePlayoffSeeds, useRefresh, useTeams } from '@/hooks';
import type { BoxScorePlayer, BoxScoreTeam } from '@/lib/espn';
import { buildPeriodOptions, timeoutLabel, deriveFlow, numsFromLine, numsFromTotals, playersWithStats, deriveQuarterStats, emptyLine, lineToStats, sumPeriods, type Line, type QuarterStats } from '@/lib/game';
import { kickoffLabel } from '@/lib/date';
import { matchupColors, mix, palette } from '@/lib/theme';
import { goBack } from '@/navigation';
import { useWatchlist } from '@/state';

const TAB_ORDER: GameTab[] = ['summary', 'box', 'plays', 'shots'];

/**
 * Game page. A slim top bar always shows the score; the big header scrolls away; a pinned
 * tab bar switches between a glanceable Summary, the Box score, Plays and Shots.
 */
export function GameScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id, o } = useLocalSearchParams<{ id: string; o?: string }>();
  const { data, isPending, error, refetch } = useGameSummary(id);
  // A finished game never changes (it is cached forever), so there is nothing to pull for.
  const refreshControl = useRefresh([['game', id]], !data?.completed);
  const { isGameWatched, toggleGame } = useWatchlist();
  const [tab, setTab] = useState<GameTab>('summary');
  const [slide, setSlide] = useState<1 | -1>(1);
  const [periodKey, setPeriodKey] = useState('full');

  const scrollY = useSharedValue(0);
  // Where the big header's logo slots are on screen at scroll 0 (centers). These first guesses are replaced by the
  // measured positions as soon as the header is laid out.
  const slotY = insets.top + 94;
  const awaySlot = useSharedValue<LogoSlot>({ x: HERO_INSET, y: slotY });
  const homeSlot = useSharedValue<LogoSlot>({ x: width - HERO_INSET, y: slotY });
  // The header reports each slot relative to itself; the scroll frame's place in this screen is added here. Neither depends on how far
  // the page is scrolled or pulled (a window position plus the scroll offset went wrong when a refresh re-laid-out the header).
  const frame = useRef({ x: 0, y: 0 });
  const relative = useRef<{ away?: LogoSlot; home?: LogoSlot }>({});
  const place = () => {
    const { away: a, home: h } = relative.current;
    if (a) awaySlot.set({ x: frame.current.x + a.x, y: frame.current.y + a.y });
    if (h) homeSlot.set({ x: frame.current.x + h.x, y: frame.current.y + h.y });
  };
  const onLogoSlot = (side: 'away' | 'home', x: number, y: number) => {
    relative.current[side] = { x, y };
    place();
  };
  const flick = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // The header's collapse (logos gliding into the bar) takes this much scroll. A scroll that comes to rest inside it
  // would leave the logos half way, so it is finished for you: back to the top, or on to the collapsed bar.
  const collapseEnd = () => {
    'worklet';
    return Math.max(60, awaySlot.get().y - (insets.top + 10 + 22));
  };
  const settle = (y: number, velocity: number) => {
    'worklet';
    const end = collapseEnd();
    if (y <= 1 || y >= end - 1) return;
    // A flick decides by its direction; a slow release by which side of the middle it stopped on.
    const down = Math.abs(velocity) > 0.25 ? velocity > 0 : y > end / 2;
    scrollTo(scrollRef, 0, down ? end : 0, true);
  };
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.set(e.contentOffset.y);
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
    withTiming(scrollY.get() > 56 ? 1 : 0, { duration: 300, easing: Easing.out(Easing.cubic) }),
  );
  const heroTintStyle = useAnimatedStyle(() => ({ opacity: 1 - pinned.get() }));
  // While the game loads, its teams (and so its colors) are often already known from a list the user came from.
  const { data: allTeams } = useTeams();
  // A playoff game shows each team's seed.
  const seeds = usePlayoffSeeds(data?.season, data?.kind === 'playoffs');
  const pair = useGameTeams(id);
  // The head-to-head card reads a long history: start it as soon as the teams are known (often before the game itself has
  // arrived), under the same key the card uses. It is the away team's side, as the card reads it.
  useHeadToHead(pair?.awayId, pair?.homeId);
  const knownAway = allTeams?.find((t) => t.id === pair?.awayId);
  const knownHome = allTeams?.find((t) => t.id === pair?.homeId);
  const known = knownAway && knownHome ? (() => { const c = matchupColors(knownAway, knownHome); return { away: c.away, home: c.home }; })() : null;
  // A soft shadow under the top bar once content has scrolled beneath it (the tab bar carries its own when pinned).
  const edgeStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.get(), [0, 24], [0, 1], Extrapolation.CLAMP) }));

  if (isPending) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <GameBackdrop awayColor={known?.away} homeColor={known?.home} />
        <GameSkeleton />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={[styles.errorBack, { top: insets.top + 8 }]}>
          <IconButton onPress={goBack} label="Go back">
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
  const { base, tint } = backdropColors(awayColor, homeColor);

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
  // "NOP TO" while a team's timeout is on (the clock has stopped), "Official TO" for a TV or official one.
  const onTimeout = timeoutLabel(plays, live, [away, home]);

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
    <View style={styles.root}>
      <GameBackdrop awayColor={awayColor} homeColor={homeColor} heroStyle={heroTintStyle} />

      <GameTopBar
        collapsed={collapsed}
        away={away}
        home={home}
        status={status}
        live={live}
        hasStarted={hasStarted}
        tag={data.cup ? 'NBA CUP' : data.kind === 'playoffs' || data.kind === 'playin' ? (playoffTag(data.note) ?? undefined) : undefined}
        kickoff={info.date ? kickoffLabel(info.date) : undefined}
        watched={isGameWatched(id)}
        onWatch={() => {
          Haptics.selectionAsync();
          toggleGame({
            id,
            date: info.date ?? '',
            away: { id: away.team.id, abbr: away.team.abbreviation, logo: away.team.logoDark || away.team.logo },
            home: { id: home.team.id, abbr: home.team.abbreviation, logo: home.team.logoDark || home.team.logo },
          });
        }}
        tint={tint}
        pinned={pinned}
      />

      <View
        style={{ flex: 1 }}
        onLayout={(e) => {
          frame.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y };
          place();
        }}>
      <Animated.ScrollView
        ref={scrollRef}
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
          onLogoSlot={onLogoSlot}
          scrollY={scrollY}
          timeout={onTimeout}
          seeds={seeds ? { away: seeds[away.team.id], home: seeds[home.team.id] } : undefined}
          series={data.series}
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
              videos={data.videos}
              kind={data.kind}
              season={data.season}
              note={data.note}
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
              completed={completed}
              live={live}
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

      <GameLogos
        away={away}
        home={home}
        scrollY={scrollY}
        awaySlot={awaySlot}
        homeSlot={homeSlot}
        hasStarted={hasStarted}
        awayBonus={live && !!away.fouls?.bonus}
        homeBonus={live && !!home.fouls?.bonus}
        gameId={id}
        origin={o}
      />
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
