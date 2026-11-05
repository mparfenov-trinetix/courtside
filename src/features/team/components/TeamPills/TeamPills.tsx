import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useStripFollow } from '@/hooks';
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
      // Opens with the selected team in the middle.
      onLayout={(e) => layout(e.nativeEvent.layout.width, selected)}
      style={styles.strip}
      contentContainerStyle={{ width: contentWidth, height: PILL_HEIGHT }}>
      {/* One layer for the outline and the pills, moved together, so the outline can never drift from them. */}
      <Animated.View style={[styles.layer, { width: contentWidth }, contentStyle]}>
        <Animated.View pointerEvents="none" style={[styles.outline, outline]} />
        <View style={styles.row}>
          {teams.map((team, index) => (
            <Pill key={team.id} team={team} index={index} page={page} on={index === selected} onPress={() => choose(index)} />
          ))}
        </View>
      </Animated.View>
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
  pill: { width: PILL_WIDTH, height: PILL_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 4 },
  logoBox: { width: LOGO, height: LOGO },
  abbr: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.3 },
});
