import { Image } from 'expo-image';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { Team } from '@/lib/espn';
import { fonts, logoOn, palette, teamTheme, withAlpha } from '@/lib/theme';
import { LOGO, OUTLINE, PILL_GAP, PILL_HEIGHT, PILL_WIDTH, STRIP_PADDING } from './constants';

const STEP = PILL_WIDTH + PILL_GAP;

/**
 * A strip with a small pill for every team. `page` is the pager's position as a fractional page; the strip is
 * driven by it directly, so the outline around the current team, the pills' colors and the strip's own scroll
 * move in lockstep with the pager, whatever moved it. The outline takes the colors of the team it is on.
 */
export function TeamPills({
  teams,
  page,
  jump,
  selected,
  onSelect,
}: {
  teams: Team[];
  page: SharedValue<number>;
  /** During a long jump the outline slides along the strip but its colors cross-fade straight from the old team to the new one. */
  jump?: { from: SharedValue<number>; to: SharedValue<number>; blend: SharedValue<number> };
  selected: number;
  onSelect: (index: number) => void;
}) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const viewWidth = useSharedValue(0);
  const indexes = teams.map((_, i) => i);
  const accents = teams.map((t) => teamTheme(t).accent);
  const tints = teams.map((t) => withAlpha(teamTheme(t).accent, 0.16));
  const contentWidth = STRIP_PADDING * 2 + teams.length * STEP - PILL_GAP;

  // Where the strip would put a page in the middle of the view (clamped at the ends).
  const centered = (at: number) => {
    'worklet';
    const x = at * STEP + STRIP_PADDING + PILL_WIDTH / 2 - viewWidth.get() / 2;
    return Math.max(0, Math.min(x, contentWidth - viewWidth.get()));
  };

  // The strip follows the pager frame by frame, keeping the current team in the middle. If you have scrolled the strip
  // yourself, it starts from where you left it and eases into the centered position as the pager moves on, so a tap
  // after a long scroll doesn't first jump the strip back to the old team.
  const scrollX = useSharedValue(0);
  const userMoving = useSharedValue(false);
  const manual = useSharedValue(false);
  const manualX = useSharedValue(0);
  const manualPage = useSharedValue(0);
  const fadeOver = useSharedValue(1.5);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.set(e.contentOffset.x);
      if (!userMoving.get()) return;
      manual.set(true);
      manualX.set(e.contentOffset.x);
      manualPage.set(page.get());
      fadeOver.set(1.5);
    },
    onBeginDrag: () => {
      userMoving.set(true);
    },
    onEndDrag: (e) => {
      if (e.velocity?.x === 0) userMoving.set(false);
    },
    onMomentumEnd: () => {
      userMoving.set(false);
    },
  });

  // Once the pager has travelled far enough from where the strip was left, the leftover offset has faded out completely:
  // drop it, or it would come back (and pull the strip off the current team) the next time the pager passed that spot.
  useAnimatedReaction(
    () => manual.get() && !userMoving.get() && Math.abs(page.get() - manualPage.get()) >= fadeOver.get(),
    (spent) => {
      if (spent) manual.set(false);
    },
  );

  useAnimatedReaction(
    () => {
      const target = centered(page.get());
      if (!manual.get()) return target;
      const weight = Math.max(0, 1 - Math.abs(page.get() - manualPage.get()) / fadeOver.get());
      return target + (manualX.get() - centered(manualPage.get())) * weight;
    },
    (x) => {
      if (userMoving.get()) return;
      scrollTo(scrollRef, Math.max(0, Math.min(x, contentWidth - viewWidth.get())), 0, false);
    },
  );

  // A tap names the team on the UI thread, where the strip's real offset and the pager's position are known: the strip
  // eases from where it is to the new team over the whole trip of the pager.
  const tapped = useSharedValue<{ index: number; n: number } | null>(null);
  const taps = useRef(0);
  useAnimatedReaction(
    () => tapped.get(),
    (tap) => {
      if (!tap) return;
      manual.set(true);
      manualX.set(scrollX.get());
      manualPage.set(page.get());
      fadeOver.set(Math.max(1.5, Math.abs(tap.index - page.get())));
    },
  );
  const choose = (index: number) => {
    taps.current += 1;
    tapped.set({ index, n: taps.current });
    onSelect(index);
  };

  const outline = useAnimatedStyle(() => {
    const blend = jump ? jump.blend.get() : -1;
    if (jump && blend >= 0) {
      return {
        transform: [{ translateX: STRIP_PADDING + page.get() * STEP }],
        borderColor: interpolateColor(blend, [0, 1], [accents[jump.from.get()], accents[jump.to.get()]]),
        backgroundColor: interpolateColor(blend, [0, 1], [tints[jump.from.get()], tints[jump.to.get()]]),
      };
    }
    return {
      transform: [{ translateX: STRIP_PADDING + page.get() * STEP }],
      borderColor: interpolateColor(page.get(), indexes, accents),
      backgroundColor: interpolateColor(page.get(), indexes, tints),
    };
  });

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onLayout={(e) => {
        const width = e.nativeEvent.layout.width;
        viewWidth.set(width);
        // Opens with the selected team in the middle.
        const x = selected * STEP + STRIP_PADDING + PILL_WIDTH / 2 - width / 2;
        scrollRef.current?.scrollTo({ x: Math.max(0, Math.min(x, contentWidth - width)), animated: false });
      }}
      style={styles.strip}
      contentContainerStyle={{ width: contentWidth, height: PILL_HEIGHT }}>
      {/* Inside the scrolling content, so it can never drift from the pills. */}
      <Animated.View pointerEvents="none" style={[styles.outline, outline]} />
      <View style={styles.row}>
        {teams.map((team, index) => (
          <Pill key={team.id} team={team} index={index} page={page} on={index === selected} onPress={() => choose(index)} />
        ))}
      </View>
    </Animated.ScrollView>
  );
}

function Pill({
  team,
  index,
  page,
  on,
  onPress,
}: {
  team: Team;
  index: number;
  page: SharedValue<number>;
  on: boolean;
  onPress: () => void;
}) {
  // Only the pills the outline is on or moving between do any work; the other twenty-odd stay put (the worklets run every
  // frame of a swipe, and color interpolation is the costly part).
  const logo = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(page.get() - index));
    return { transform: [{ scale: near === 0 ? 1 : 1 + 0.12 * near }] };
  });
  const label = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(page.get() - index));
    return { color: near === 0 ? palette.muted : interpolateColor(near, [0, 1], [palette.muted, palette.chalk]) };
  });

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={team.displayName} accessibilityState={{ selected: on }} style={styles.pill}>
      <Animated.View style={[styles.logoBox, logo]}>
        <Image source={logoOn(team, '#FFFFFF')} style={StyleSheet.absoluteFill} contentFit="contain" />
      </Animated.View>
      <Animated.Text style={[styles.abbr, label]}>{team.abbreviation}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: { height: PILL_HEIGHT, flexGrow: 0 },
  row: { position: 'absolute', left: STRIP_PADDING, top: 0, flexDirection: 'row', gap: PILL_GAP },
  outline: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: 16,
    borderWidth: OUTLINE,
  },
  pill: { width: PILL_WIDTH, height: PILL_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 4 },
  logoBox: { width: LOGO, height: LOGO },
  abbr: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.3 },
});
