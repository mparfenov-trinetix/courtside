import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';

import { mix, palette, withAlpha } from '@/lib/theme';

/** The page's deep base color and the opaque left/right colors the pinned bars use, from the two teams' colors. */
export function backdropColors(awayColor: string, homeColor: string) {
  const base = mix(palette.arena, mix(awayColor, homeColor, 0.5), 0.1);
  return { base, tint: [mix(base, awayColor, 0.2), mix(base, homeColor, 0.2)] as [string, string] };
}

/**
 * The game page's team-colored background: a base mixed from both colors, a wash from one team to the other, and a
 * stronger tint behind the header. The loading skeleton uses the same thing, so nothing changes color when data arrives.
 */
export function GameBackdrop({
  awayColor,
  homeColor,
  heroStyle,
}: {
  awayColor?: string;
  homeColor?: string;
  /** Animated style for the header tint (it fades once the tab bar pins). */
  heroStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
}) {
  if (!awayColor || !homeColor) return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.arena }]} />;
  const { base } = backdropColors(awayColor, homeColor);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: base }]}>
      <LinearGradient
        colors={[withAlpha(awayColor, 0.2), withAlpha(homeColor, 0.2)]}
        start={{ x: 0, y: 0.15 }}
        end={{ x: 1, y: 0.95 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, heroStyle]}>
        <LinearGradient
          colors={[withAlpha(awayColor, 0.34), withAlpha(homeColor, 0.34)]}
          start={{ x: 0, y: 0.4 }}
          end={{ x: 1, y: 0.6 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient colors={[withAlpha(base, 0), withAlpha(base, 0.78)]} locations={[0, 0.42]} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}
