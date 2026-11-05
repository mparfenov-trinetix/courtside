import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View, type FlatList, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Easing, useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated';

import { prefetchGamesOnDay } from '@/hooks';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { MONTHS } from '../../constants';
import { DayPage } from '../DayPage';
import { DayPills } from '../DayPills';

/** Moves of up to this many days slide; further ones jump (sliding through weeks would mean mounting them all). */
const NEAR = 2;
const JUMP_MS = 340;
/** After the pager stops, how long before the pages around it are filled in. */
const STEADY_MS = 120;

/**
 * The day view as a pager, built like the rosters: one page per day, swipe sideways to move between days, or tap a day in the
 * strip above. The strip is driven by the pager's position frame by frame (`page`), so its highlight and scroll move in
 * lockstep with a swipe, a tap or the Today button. Only the visible day and its neighbours are mounted.
 */
export function DayPager({
  dates,
  today,
  selected,
  onSelect,
  accent,
  gameDays,
}: {
  dates: Date[];
  today: Date;
  selected: Date;
  onSelect: (d: Date) => void;
  /** The selected team's color, for the dot under the days it plays. */
  accent: string;
  /** The days (local YYYYMMDD) the selected team plays. */
  gameDays: Set<string>;
}) {
  const { width } = useWindowDimensions();
  const pagerRef = useRef<FlatList<Date>>(null);
  const found = dates.findIndex((d) => d.getTime() === selected.getTime());
  const index = found < 0 ? Math.max(0, dates.findIndex((d) => d.getTime() === today.getTime())) : found;

  // The page the pager is on (or heading to).
  const at = useRef(index);
  // The page a tap asked for while its scroll is still running: rapid taps build on it, and the scroll-end events of the
  // animations they interrupted are ignored.
  const pending = useRef<number | null>(null);
  // The day the pager last came to rest on: it and its neighbours show real games, every other page shows still empty cards.
  // (Before the first rest the day on screen is the one that counts.)
  const [settledAt, setSettledAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const settleSoon = useCallback((at: number, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSettledAt(at), ms);
  }, []);
  // The screen has opened: fill in the days around the one on screen.
  useEffect(() => {
    settleSoon(at.current, 350);
    return () => clearTimeout(timer.current);
  }, [settleSoon]);
  // Once at rest, the days a swipe or two away are read into the cache, so the next page opens with its games.
  const client = useQueryClient();
  useEffect(() => {
    if (settledAt == null) return;
    for (const at of [settledAt - 1, settledAt + 1, settledAt - 2, settledAt + 2]) {
      if (dates[at]) prefetchGamesOnDay(client, dates[at]);
    }
  }, [settledAt, dates, client]);
  // The pager's position as a fractional page (1.5 = halfway from the second day to the third): the strip follows it.
  const page = useSharedValue(index);
  // While a long jump plays the strip is animated here and the pager itself is moved in one step.
  const jumping = useSharedValue(false);

  const onScroll = useAnimatedScrollHandler((e) => {
    if (jumping.get()) return;
    page.set(e.contentOffset.x / width);
  });

  const moveTo = useCallback(
    (next: number) => {
      const from = pending.current ?? at.current;
      if (next === from) return;
      at.current = next;
      if (Math.abs(next - from) > NEAR) {
        jumping.set(true);
        pagerRef.current?.scrollToIndex({ index: next, animated: false });
        page.set(
          withTiming(next, { duration: JUMP_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
            if (finished) jumping.set(false);
          }),
        );
        // The pager is already there: nothing more will report that it came to rest.
        pending.current = null;
        settleSoon(next, JUMP_MS);
      } else {
        pending.current = next;
        pagerRef.current?.scrollToIndex({ index: next, animated: true });
      }
    },
    [jumping, page, settleSoon],
  );

  // A change the screen made (the Today button, a month pick) moves the pager the same way a tap does.
  useEffect(() => {
    if (index !== at.current) moveTo(index);
  }, [index, moveTo]);

  const choose = (next: number) => {
    if (next < 0 || next >= dates.length || next === (pending.current ?? at.current)) return;
    Haptics.selectionAsync();
    moveTo(next);
    onSelect(dates[next]);
  };

  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const settled = Math.round(e.nativeEvent.contentOffset.x / width);
    if (pending.current != null && settled !== pending.current) return;
    pending.current = null;
    settleSoon(settled, STEADY_MS);
    if (settled === at.current || !dates[settled]) return;
    at.current = settled;
    Haptics.selectionAsync();
    onSelect(dates[settled]);
  };

  // Which day this is, in words: the month and year (the strip alone does not say, once a day far away is picked) and how far
  // from today it lies.
  const days = Math.round((selected.getTime() - today.getTime()) / 86_400_000);
  const away = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days === -1 ? 'Yesterday' : days > 0 ? `In ${days} days` : `${-days} days ago`;

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>
          {MONTHS[selected.getMonth()]} <Text style={styles.year}>{selected.getFullYear()}</Text>
        </Text>
        <Text style={styles.away}>{away}</Text>
      </View>
      <View style={styles.strip}>
        <DayPills dates={dates} today={today} page={page} selected={index} onSelect={choose} accent={accent} gameDays={gameDays} />
      </View>

      <Animated.FlatList
        ref={pagerRef}
        data={dates}
        horizontal
        pagingEnabled
        extraData={[index, settledAt]}
        keyExtractor={(d) => d.toISOString()}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        // The visible day and one on each side. A longer jump is not scrolled through (see moveTo).
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // A finger on the pager takes over from any scroll a tap started.
        onScrollBeginDrag={() => {
          pending.current = null;
          // The pager is moving again: nothing new is filled in until it stops.
          clearTimeout(timer.current);
        }}
        onMomentumScrollEnd={onSettled}
        renderItem={({ item, index: i }) => (
          <DayPage date={item} today={today} width={width} active={settledAt == null ? i === index : Math.abs(i - settledAt) <= 1} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 2 },
  title: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  year: { color: palette.muted },
  away: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
  strip: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.08), marginBottom: 6 },
});
