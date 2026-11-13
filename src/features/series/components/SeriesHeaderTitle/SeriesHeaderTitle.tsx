import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { fonts, palette } from '@/lib/theme';

/** Where the hero's score row has scrolled out of sight: the compact title is gone before `START`, whole by `END`. */
const START = 70;
const END = 140;

/**
 * The series page's top bar once the hero has scrolled away: both teams' logos and codes around the series score ("BOS 2 – 4 GS"), rising into
 * the bar from below as the big score leaves it (the game page's top bar does the same for one game). Empty over the hero, so the matchup is
 * never on screen twice. It is the `title` node of the `ScreenHeader` (centered on the screen).
 */
export function SeriesHeaderTitle({
  top,
  bottom,
  scrollY,
}: {
  top: { abbr: string; logo?: string; score?: number };
  bottom: { abbr: string; logo?: string; score?: number };
  scrollY: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [START, END], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.get(), [START, END], [22, 0], Extrapolation.CLAMP) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.group, style]}>
      {top.logo ? <Image source={top.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.logo} />}
      <Text style={styles.abbr}>{top.abbr}</Text>
      <Text style={styles.score}>
        {top.score ?? 0}
        <Text style={{ color: palette.muted }}> – </Text>
        {bottom.score ?? 0}
      </Text>
      <Text style={styles.abbr}>{bottom.abbr}</Text>
      {bottom.logo ? <Image source={bottom.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.logo} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 30, height: 30 },
  abbr: { fontFamily: fonts.displayBold, fontSize: 20, color: palette.chalk },
  score: { fontFamily: fonts.display, fontSize: 26, color: palette.chalk },
});
