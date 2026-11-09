import { StyleSheet, Text, View } from 'react-native';

import { parseStatNum } from '@/lib/game';
import { fonts, palette, ratingTone, withAlpha } from '@/lib/theme';
import { RATING_BOX } from './constants';

/** The Courtside Rating as a solid square in its band's color (a dash on no color for a player with none). */
export function RatingSquare({ value, size = RATING_BOX, fontSize = 13 }: { value?: string; size?: number; fontSize?: number }) {
  const rating = parseStatNum(value);
  const tone = rating !== -Infinity ? ratingTone(rating) : undefined;
  return (
    <View style={[styles.box, { width: size, height: size }, tone && { backgroundColor: tone.background }]}>
      <Text
        style={[styles.text, { fontSize, color: tone?.text ?? withAlpha(palette.chalk, 0.75) }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}>
        {tone ? value : '–'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.bodySemi },
});
