import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { Easing, interpolateColor, withTiming, useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { IconButton, ListSkeleton, OptionSheet, ScreenHeader } from '@/components';
import { useSceneSettled, useTeams, useAppWindow, useKeepPagerPlace } from '@/hooks';
import { fetchRoster, type Team } from '@/lib/espn';
import { palette, teamTheme } from '@/lib/theme';
import { useScreenTeamStore } from '@/state';
import { COMPACT_AT, TeamPills, TeamRoster } from '../../components';
import { ROSTER_MODES, type RosterMode } from '../../constants';
import { loadRosterMode, rememberedRosterMode, saveRosterMode } from '../../utils/roster-mode';

/** After the slide-in from the menu is over, how long before the rows are built. */
const OPEN_MS = 100;
/** Once at rest, the first of the nearby teams is read this long after, then the others one at a time this far apart (each answer is parsed and cached on the JS thread). */
const PREFETCH_FIRST_MS = 500;
const PREFETCH_GAP_MS = 350;
/** Moves of up to this many teams slide; further ones jump. */
const NEAR = 2;
const JUMP_MS = 340;
const STEADY_MS = 120;
const ROSTER_STALE_MS = 6 * 60 * 60 * 1000;

/** The Teams screen: every team's roster, one page per team: swipe sideways, tap a pill, or use the arrows to move between them. */
export function RosterScreen() {
  const { data: teams } = useTeams();
  const { currentTeamId, favoriteTeamId } = useScreenTeamStore();

  if (!teams) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Teams" />
        <ListSkeleton count={10} />
      </View>
    );
  }

  const sorted = [...teams].sort((a, b) => a.displayName.localeCompare(b.displayName));
  const viewing = currentTeamId ?? favoriteTeamId;
  const found = sorted.findIndex((t) => t.id === viewing);
  const start = found < 0 ? 0 : found;
  // The screen stays mounted in the drawer: keyed by the team being viewed, so choosing another team elsewhere and coming
  // back opens on that one (swiping here doesn't change it).
  return <RosterPager key={viewing ?? 'none'} teams={sorted} start={start} />;
}

function RosterPager({ teams, start }: { teams: Team[]; start: number }) {
  const { width } = useAppWindow();
  const pagerRef = useRef<FlatList<Team>>(null);
  const [index, setIndex] = useState(start);
  // Turned to a new width the pager stays on its team.
  useKeepPagerPlace(pagerRef, index, width);
  // The view of every team's page: the list, a card for each player to swipe through, or the team's insights. In the card view the pager's own
  // sideways swipe is off (a swipe on the cards must not change team); the pills and arrows still do.
  const [mode, setModeState] = useState<RosterMode>(() => rememberedRosterMode() ?? 'list');
  const setMode = (next: RosterMode) => {
    setModeState(next);
    saveRosterMode(next);
  };
  // The first time after launch the saved view is read from disk; a view picked meanwhile wins.
  useEffect(() => {
    let live = true;
    loadRosterMode().then((saved) => {
      if (live && saved) setModeState(saved);
    });
    return () => {
      live = false;
    };
  }, []);
  const [sheet, setSheet] = useState(false);
  const current = ROSTER_MODES.find((m) => m.key === mode) ?? ROSTER_MODES[0]!;
  // Where each page's list has scrolled to (by place in the pager; a page that was never scrolled has no entry). The strip folds up as the page under it
  // scrolls: its codes fade and it shortens, and between two pages of the pager it blends from one page's state to the other's.
  const offsets = useSharedValue<Record<number, number>>({});
  useEffect(() => {
    offsets.set({});
  }, [mode, offsets]);
  // The page a tap or arrow asked for while its scroll is still running. Rapid taps build on it, not on the page
  // last settled on, and the scroll-end events of the animations they interrupted are ignored.
  const pending = useRef<number | null>(null);
  // The team the pager last came to rest on (null until the screen has opened): it and its neighbours show real rows.
  const [settledAt, setSettledAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const settleSoon = (at: number, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSettledAt(at), ms);
  };
  // The rows already built stay while the pager moves: the page that was settled on (and its neighbours) keeps its rows.
  const unsettle = () => clearTimeout(timer.current);
  const opened = useSceneSettled(OPEN_MS);
  useEffect(() => {
    // The screen has opened (the menu has finished sliding it in): now fill it in.
    if (!opened) return;
    const t = setTimeout(() => setSettledAt(start), 0);
    return () => {
      clearTimeout(t);
      clearTimeout(timer.current);
    };
  }, [opened, start]);
  // Once at rest, the teams a swipe or two away are fetched and their first headshots decoded, so the next page opens with
  // everything it needs already in the cache (rosters are kept for a week and persisted, so this is paid once).
  const client = useQueryClient();
  useEffect(() => {
    if (settledAt == null) return;
    // One team at a time, the nearest first, and not before the page that was settled on has drawn its own rows.
    const timers = [settledAt + 1, settledAt - 1, settledAt + 2, settledAt - 2].map((at, i) =>
      setTimeout(() => {
        const team = teams[at];
        if (!team) return;
        client
          .fetchQuery({ queryKey: ['roster', team.id], queryFn: () => fetchRoster(team.id), staleTime: ROSTER_STALE_MS })
          .then((roster) => Image.prefetch(roster.players.slice(0, 9).flatMap((p) => (p.headshot ? [p.headshot] : []))))
          .catch(() => {});
      }, PREFETCH_FIRST_MS + i * PREFETCH_GAP_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [settledAt, teams, client]);
  // The pager's position as a fractional page (1.5 = halfway from the second team to the third). The screen's
  // background follows it, so it blends from one team's color to the next as the pages slide, whatever moved them.
  const page = useSharedValue(start);
  const pages = teams.map((_, i) => i);
  const colors = teams.map((t) => teamTheme(t).background);
  // While a long jump plays, the screen's background, outline and strip are animated here and the pager itself is moved in
  // one step: sliding through twenty pages would mean mounting them all, which is what made the screen heavy.
  const jumping = useSharedValue(false);
  // A long jump cross-fades the background and the outline straight from the old team's color to the new one; going through
  // `page` would flash every team in between.
  const jumpFrom = useSharedValue(0);
  const jumpTo = useSharedValue(0);
  const jumpBlend = useSharedValue(-1);
  const onScroll = useAnimatedScrollHandler((e) => {
    if (jumping.get()) return;
    page.set(e.contentOffset.x / width);
  });
  // Whether the page under the strip has scrolled far enough to fold it, blended between two pages while the pager is between them, and then eased in
  // time (as the game page's collapse is), not tied to the finger: a fast flick would otherwise snap it in a frame or two, and a slow drag would
  // leave the strip half folded.
  const compact = useDerivedValue(() => {
    const at = page.get();
    const low = Math.floor(at);
    const part = at - low;
    const folded = (i: number) => ((offsets.get()[i] ?? 0) > COMPACT_AT ? 1 : 0);
    const want = part === 0 ? folded(low) : folded(low) * (1 - part) + folded(low + 1) * part;
    return withTiming(want, { duration: 260, easing: Easing.out(Easing.cubic) });
  });
  const background = useAnimatedStyle(() => ({
    backgroundColor:
      jumpBlend.get() >= 0
        ? interpolateColor(jumpBlend.get(), [0, 1], [colors[jumpFrom.get()], colors[jumpTo.get()]])
        : interpolateColor(page.get(), pages, colors),
  }));

  const goTo = (next: number) => {
    const from = pending.current ?? index;
    if (next < 0 || next >= teams.length || next === from) return;
    Haptics.selectionAsync();
    pending.current = next;
    unsettle();
    setIndex(next);
    if (Math.abs(next - from) > NEAR) {
      jumping.set(true);
      jumpFrom.set(Math.min(teams.length - 1, Math.max(0, Math.round(page.get()))));
      jumpTo.set(next);
      jumpBlend.set(0);
      jumpBlend.set(withTiming(1, { duration: JUMP_MS, easing: Easing.inOut(Easing.cubic) }));
      pagerRef.current?.scrollToIndex({ index: next, animated: false });
      page.set(
        withTiming(next, { duration: JUMP_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) {
            jumping.set(false);
            jumpBlend.set(-1);
          }
        }),
      );
      // The pager is already there: nothing more will report that it came to rest.
      pending.current = null;
      settleSoon(next, JUMP_MS);
    } else {
      pagerRef.current?.scrollToIndex({ index: next, animated: true });
    }
  };

  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const settled = Math.round(e.nativeEvent.contentOffset.x / width);
    if (pending.current != null && settled !== pending.current) return;
    pending.current = null;
    settleSoon(settled, STEADY_MS);
    if (settled === index) return;
    Haptics.selectionAsync();
    setIndex(settled);
  };

  return (
    <Animated.View style={[styles.root, background]}>
      <ScreenHeader
        title="Teams"
        right={
          <IconButton onPress={() => setSheet(true)} label={`Roster view: ${current.label}. Change view`}>
            <current.Icon color={palette.chalk} size={22} />
          </IconButton>
        }
      />

      <View style={styles.strip}>
        <TeamPills teams={teams} page={page} compact={compact} jump={{ from: jumpFrom, to: jumpTo, blend: jumpBlend }} selected={index} onSelect={goTo} />
      </View>

      <Animated.FlatList
        ref={pagerRef}
        data={teams}
        horizontal
        pagingEnabled
        extraData={[index, mode]}
        keyExtractor={(t) => t.id}
        showsHorizontalScrollIndicator={false}
        // The cards swipe sideways too: with that view open the pager stays put (the pills and arrows change team).
        scrollEnabled={mode !== 'cards'}
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        // The visible page and two on each side. A longer jump is not scrolled through (see goTo).
        windowSize={5}
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        // A finger on the pager takes over from any scroll a tap started.
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          pending.current = null;
          unsettle();
        }}
        onMomentumScrollEnd={onSettled}
        renderItem={({ item, index: i }) => (
          <TeamRoster
            team={item}
            width={width}
            active={Math.abs(i - index) <= 1 || (settledAt != null && Math.abs(i - settledAt) <= 1)}
            rows={settledAt != null && Math.abs(i - settledAt) <= 1}
            mode={mode}
            pageIndex={i}
            offsets={offsets}
          />
        )}
      />

      <OptionSheet visible={sheet} title="Roster view" options={ROSTER_MODES} value={mode} onPick={setMode} onClose={() => setSheet(false)} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.arena },
  strip: { paddingBottom: 8 },
});
