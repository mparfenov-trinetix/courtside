import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { BoxScorePlayer } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { GOLD } from './constants';

/** A player's photo in a circle (his initial when ESPN has none); with `starterLabel` a small gold "Starter" tag sits over its bottom edge. */
export function PlayerAvatar({ player, size, starterLabel = false }: { player: BoxScorePlayer; size: number; starterLabel?: boolean }) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={{ width: size, height: size }}>
      {player.headshot ? (
        <Image source={player.headshot} style={[round, styles.photo]} contentFit="cover" />
      ) : (
        <View style={[round, styles.placeholder]}>
          <Text style={styles.initials}>{(player.shortName || player.name).charAt(0)}</Text>
        </View>
      )}
      {starterLabel && player.starter ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>Starter</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { overflow: 'hidden' },
  placeholder: { backgroundColor: withAlpha(palette.chalk, 0.1), alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.muted },
  tag: { position: 'absolute', bottom: -5, alignSelf: 'center', height: 14, paddingHorizontal: 6, borderRadius: 7, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 9, color: palette.arena },
});
