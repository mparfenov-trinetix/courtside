import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Team } from '@/lib/espn';
import { logoOn, OUTLINE, OUTLINED_LOGO, OUTLINED_OPACITY, OUTLINED_WATERMARK, OUTLINE_STEPS, STRONG_WATERMARK, WATERMARK_OPACITY } from '@/lib/theme';

/**
 * A team's logo drawn faint on a card in the team's color: `size` wide and tall, `onColor` the card's text color (it picks the logo that
 * reads on the card). Crisp for most teams, outlined for the ones whose logo is their card's color: see `OUTLINED_WATERMARK` in `lib/theme`. Position it with `style`.
 */
export function LogoWatermark({ team, onColor, size, style }: { team: Pick<Team, 'logo' | 'logoDark' | 'logoOnPrimary' | 'abbreviation'>; onColor: string; size: number; style?: StyleProp<ViewStyle> }) {
  const logo = logoOn(team, onColor);
  if (!logo) return null;
  const abbr = team.abbreviation;
  const outlined = OUTLINED_LOGO.has(abbr) || OUTLINED_WATERMARK.has(abbr);
  const opacity = outlined ? OUTLINED_OPACITY : (STRONG_WATERMARK[abbr] ?? WATERMARK_OPACITY);
  return (
    <View pointerEvents="none" style={[{ width: size, height: size, opacity }, style]}>
      {outlined &&
        OUTLINE_STEPS.map(([dx, dy]) => (
          <Image
            key={`${dx}${dy}`}
            source={logo}
            tintColor="#FFFFFF"
            contentFit="contain"
            style={{ position: 'absolute', width: '100%', height: '100%', left: dx * size * OUTLINE, top: dy * size * OUTLINE }}
          />
        ))}
      <Image source={logo} style={StyleSheet.absoluteFill} contentFit="contain" allowDownscaling={false} priority="high" cachePolicy="memory-disk" />
    </View>
  );
}
