import { Image } from 'expo-image';
import { View } from 'react-native';

/** ESPN's NBA logo, the variant made for dark backgrounds. */
const NBA_LOGO = 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500-dark/nba.png&w=500&h=500&transparent=true';

// The image is a 500 x 500 canvas with the mark in the middle: about 41% of the width and 92% of the height of it (measured from the
// PNG's transparent margins), centered.
const MARK_W = 0.406;
const MARK_H = 0.92;

/**
 * The NBA logo. By default it sits, whole canvas and margins included, in a box `size` tall and half as wide, so the mark itself comes
 * out at under half of `size`: the sizes the intro, the menu and the month view use were chosen for that. With `tight` the margins are
 * cropped away and `size` is the height of the mark itself (it is about 0.44 times as wide as tall), so it fills the room it is given.
 */
export function NbaLogo({ size = 32, tight = false }: { size?: number; tight?: boolean }) {
  if (!tight) {
    return <Image source={NBA_LOGO} style={{ width: size * 0.5, height: size }} contentFit="contain" accessibilityLabel="NBA" />;
  }
  const side = size / MARK_H;
  const width = side * MARK_W;
  return (
    <View accessible accessibilityLabel="NBA" style={{ width, height: size, overflow: 'hidden' }}>
      <Image
        source={NBA_LOGO}
        contentFit="contain"
        style={{ position: 'absolute', width: side, height: side, left: (width - side) / 2, top: (size - side) / 2 }}
      />
    </View>
  );
}
