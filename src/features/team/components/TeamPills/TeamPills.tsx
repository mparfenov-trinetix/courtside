import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { useStripFollow } from '@/hooks';
import type { Team } from '@/lib/espn';
import { fonts, logoOn, palette, teamTheme, withAlpha } from '@/lib/theme';
import { COMPACT_HEIGHT, LOGO, LOGO_TOP, OUTLINE, PILL_GAP, PILL_HEIGHT, PILL_WIDTH, STRIP_PADDING } from './constants';

const STEP = PILL_WIDTH + PILL_GAP;

/**
 * A strip with a small pill for every team. `page` is the pager's position as a fractional page; the strip is
 * driven by it directly, so the outline around the current team, the pills' colors and the strip's own scroll
 * move in lockstep with the pager, whatever moved it. The outline takes the colors of the team it is on.
 * `compact` (0 to 1, eased in time by the screen) is how folded the strip is: it shortens and the codes fade, while the logos stay exactly where
 * they are inside their pills (they only lose the codes under them), so scrolling never moves the row. The pills do not change width, so the strip's own
 * follow-the-pager maths is untouched.
 */
export function TeamPills({
  teams,
  page,
  jump,
  compact: compactProp,
  selected,
  onSelect,
}: {
  teams: Team[];
  page: SharedValue<number>;
  /** How far the page under the strip has scrolled, 0 to 1 (a strip with none stays full size). */
  compact?: SharedValue<number>;
  /** During a long jump the outline slides along the strip but its colors cross-fade straight from the old team to the new one. */
  jump?: { from: SharedValue<number>; to: SharedValue<number>; blend: SharedValue<number> };
  selected: number;
  onSelect: (index: number) => void;
}) {
  const none = useSharedValue(0);
  const compact = compactProp ?? none;
  const indexes = teams.map((_, i) => i);
  const accents = teams.map((t) => teamTheme(t).accent);
  const tints = teams.map((t) => withAlpha(teamTheme(t).accent, 0.16));
  const { scrollRef, onScroll, contentStyle, contentWidth, tap, layout } = useStripFollow({
    page,
    step: STEP,
    padding: STRIP_PADDING,
    itemWidth: PILL_WIDTH,
    count: teams.length,
    gap: PILL_GAP,
  });
  const choose = (index: number) => {
    tap(index);
    onSelect(index);
  };

  // One style for every code: they all fade together, so the thirty pills' own worklets stay about the pager only.
  const codeFade = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - compact.get() * 1.8) }));
  const stripStyle = useAnimatedStyle(() => ({ height: interpolate(compact.get(), [0, 1], [PILL_HEIGHT, COMPACT_HEIGHT]) }));
  const rowStyle = useAnimatedStyle(() => ({ height: interpolate(compact.get(), [0, 1], [PILL_HEIGHT, COMPACT_HEIGHT]) }));

  const outline = useAnimatedStyle(() => {
    const blend = jump ? jump.blend.get() : -1;
    if (jump && blend >= 0) {
      return {
        height: interpolate(compact.get(), [0, 1], [PILL_HEIGHT, COMPACT_HEIGHT]),
        transform: [{ translateX: STRIP_PADDING + page.get() * STEP }],
        borderColor: interpolateColor(blend, [0, 1], [accents[jump.from.get()], accents[jump.to.get()]]),
        backgroundColor: interpolateColor(blend, [0, 1], [tints[jump.from.get()], tints[jump.to.get()]]),
      };
    }
    return {
      height: interpolate(compact.get(), [0, 1], [PILL_HEIGHT, COMPACT_HEIGHT]),
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
      bounces={false}
      // Opens with the selected team in the middle.
      onLayout={(e) => layout(e.nativeEvent.layout.width, selected)}
      style={[styles.strip, stripStyle]}
      contentContainerStyle={{ width: contentWidth, height: PILL_HEIGHT }}>
      {/* One layer for the outline and the pills, moved together, so the outline can never drift from them. */}
      <Animated.View style={[styles.layer, { width: contentWidth }, contentStyle]}>
        <Animated.View pointerEvents="none" style={[styles.outline, outline]} />
        <Animated.View style={[styles.row, rowStyle]}>
          {teams.map((team, index) => (
            <Pill key={team.id} team={team} index={index} page={page} codeFade={codeFade} on={index === selected} onPress={() => choose(index)} />
          ))}
        </Animated.View>
      </Animated.View>
    </Animated.ScrollView>
  );
}

function Pill({
  team,
  index,
  page,
  codeFade,
  on,
  onPress,
}: {
  team: Team;
  index: number;
  page: SharedValue<number>;
  codeFade: ComponentProps<typeof Animated.View>['style'];
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
      <Animated.View pointerEvents="none" style={[styles.code, codeFade]}>
        <Animated.Text style={[styles.abbr, label]}>{team.abbreviation}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: { flexGrow: 0 },
  layer: { position: 'absolute', left: 0, top: 0, height: PILL_HEIGHT },
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
  pill: { width: PILL_WIDTH, alignSelf: 'stretch', alignItems: 'center', paddingTop: LOGO_TOP },
  logoBox: { width: LOGO, height: LOGO },
  // At a fixed place under the logo: shortening the strip crops it, it never moves.
  code: { position: 'absolute', top: LOGO_TOP + LOGO + 4, left: 0, right: 0, alignItems: 'center' },
  abbr: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.3 },
});
