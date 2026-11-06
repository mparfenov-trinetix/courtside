import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useAfterSettle, useStripFollow } from '@/hooks';

import { toDateKey } from '@/lib/date';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { DOW, MON, PILL, PILL_GAP, PILL_HEIGHT, STRIP_PADDING } from '../../constants';

const STEP = PILL + PILL_GAP;
/** Before the screen has settled only this many days either side of the selected one are drawn (the strip shows about seven). */
const FIRST_DRAW = 8;

/**
 * A strip with a pill for every day, driven by the pager exactly as the rosters' team strip is: `page` is the pager's position
 * as a fractional page, and the highlight under the current day, the pills' colors and the strip's own scroll all follow it
 * frame by frame, whatever moved the pager (a swipe, a tap, the Today button). If you scroll the strip yourself it starts from
 * where you left it and eases back to the current day as the pager moves on.
 */
export function DayPills({
  dates,
  today,
  page,
  selected,
  onSelect,
  accent,
  gameDays,
}: {
  dates: Date[];
  today: Date;
  page: SharedValue<number>;
  selected: number;
  onSelect: (index: number) => void;
  /** The selected team's color: today's label and the dot under the days it plays. */
  accent: string;
  /** The days (local YYYYMMDD) the selected team plays. */
  gameDays: Set<string>;
}) {
  const { scrollRef, onScroll, contentStyle, contentWidth, tap, layout } = useStripFollow({
    page,
    step: STEP,
    padding: STRIP_PADDING,
    itemWidth: PILL,
    count: dates.length,
    gap: PILL_GAP,
  });
  const choose = (index: number) => {
    tap(index);
    onSelect(index);
  };

  // The first frames draw only the days around the selected one: sixty-odd pressables at once cost more than the screen's
  // whole slide-in. The rest are added once it has settled, where the pills already shown stay as they are.
  const complete = useAfterSettle(700);
  const first = complete ? 0 : Math.max(0, selected - FIRST_DRAW);
  const last = complete ? dates.length - 1 : Math.min(dates.length - 1, selected + FIRST_DRAW);

  // The frame rides under the pills with the pager.
  const frameColor = accent;
  const frameTint = withAlpha(accent, 0.16);
  const highlight = useAnimatedStyle(() => ({
    transform: [{ translateX: STRIP_PADDING + page.get() * STEP }],
    borderColor: frameColor,
    backgroundColor: frameTint,
  }));

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      // Opens with the selected day in the middle.
      onLayout={(e) => layout(e.nativeEvent.layout.width, selected)}
      style={styles.strip}
      contentContainerStyle={{ width: contentWidth, height: PILL_HEIGHT }}>
      {/* One layer for the frame and the pills, moved together, so the frame can never drift from them. */}
      <Animated.View style={[styles.layer, { width: contentWidth }, contentStyle]}>
      <Animated.View pointerEvents="none" style={[styles.highlight, highlight]} />
      <View style={[styles.row, { left: STRIP_PADDING + first * STEP }]}>
        {dates.slice(first, last + 1).map((date, offset) => {
          const index = first + offset;
          return (
          <Pill
            key={date.getTime()}
            date={date}
            today={date.getTime() === today.getTime()}
            past={date < today}
            plays={gameDays.has(toDateKey(date))}
            accent={accent}
            on={index === selected}
            onPress={() => choose(index)}
          />
          );
        })}
      </View>
      </Animated.View>
    </Animated.ScrollView>
  );
}

/**
 * One day. It has no animation of its own: the frame under it moves with the pager, and the pill only restyles when it becomes the
 * selected one. (A style worklet per pill ran for all of them on every frame of a swipe, 66 of them in a row.)
 */
const Pill = memo(function Pill({
  date,
  today,
  past,
  plays,
  accent,
  on,
  onPress,
}: {
  date: Date;
  today: boolean;
  past: boolean;
  plays: boolean;
  accent: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${DOW[date.getDay()]} ${MON[date.getMonth()]} ${date.getDate()}${plays ? ', your team plays' : ''}`}
      accessibilityState={{ selected: on }}
      style={[styles.pill, !on && past && { opacity: 0.6 }]}>
      <Text style={[styles.dow, { color: on ? palette.chalk : today ? accent : palette.muted }]}>{today ? 'TODAY' : DOW[date.getDay()].toUpperCase()}</Text>
      <Text style={styles.num}>{date.getDate()}</Text>
      {/* The month on the first of each, so the strip still says where you are; otherwise a dot when your team plays. */}
      {date.getDate() === 1 ? (
        <Text style={[styles.mon, { color: on ? palette.chalk : palette.muted }]}>{MON[date.getMonth()].toUpperCase()}</Text>
      ) : (
        <View style={[styles.dot, { backgroundColor: plays ? accent : 'transparent' }]} />
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  strip: { height: PILL_HEIGHT, flexGrow: 0 },
  layer: { position: 'absolute', left: 0, top: 0, height: PILL_HEIGHT },
  row: { position: 'absolute', left: STRIP_PADDING, top: 0, flexDirection: 'row', gap: PILL_GAP },
  // The frame around the current day, like the outline on the rosters' team strip: the team's color, with a light tint inside.
  highlight: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PILL,
    height: PILL_HEIGHT,
    borderRadius: 18,
    borderWidth: 2,
  },
  pill: {
    width: PILL,
    height: PILL_HEIGHT,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: withAlpha(palette.chalk, 0.06),
  },
  dow: { fontFamily: fonts.bodyBold, fontSize: 9.5, letterSpacing: 0.8 },
  num: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, color: palette.chalk },
  mon: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.6, height: 7, lineHeight: 8 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 1 },
});
