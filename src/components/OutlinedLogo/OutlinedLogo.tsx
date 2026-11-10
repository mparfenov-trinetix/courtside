import { Image, type ImageSource } from 'expo-image';
import { View } from 'react-native';

import { OUTLINE_STEPS } from '@/lib/theme';

/**
 * A team logo drawn on a surface of its own color. With `outlined` (the teams in `OUTLINED_LOGO`, whose logo is the same red as their card) a
 * white copy of the logo's shape, nudged in eight directions, shows around the real one, as on the team card and the player card. `thickness`
 * is the outline's width as a fraction of `size` (the cards use a thinner one: their logos are several times as big).
 */
export function OutlinedLogo({ source, size, outlined = false, thickness = 0.035 }: { source: ImageSource | string; size: number; outlined?: boolean; thickness?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      {outlined &&
        OUTLINE_STEPS.map(([dx, dy]) => (
          <Image
            key={`${dx}${dy}`}
            source={source}
            tintColor="#FFFFFF"
            contentFit="contain"
            style={{ position: 'absolute', width: size, height: size, left: dx * size * thickness, top: dy * size * thickness }}
          />
        ))}
      <Image source={source} style={{ width: size, height: size }} contentFit="contain" />
    </View>
  );
}
