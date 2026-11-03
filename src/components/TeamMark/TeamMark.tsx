import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { Team } from '@/lib/espn';
import { fitMark, WORDMARK_TEAMS , fonts, palette } from '@/lib/theme';

/**
 * A team's header mark: ESPN's small secondary logo (an emblem, or for a few teams a lettered wordmark)
 * beside the team name. The artwork is fitted to an exact box from its measured shape, so a wide
 * wordmark and a tall emblem come out the same visual size.
 */
export function TeamMark({ team, height = 30 }: { team: Pick<Team, 'abbreviation' | 'name' | 'mark' | 'logoDark' | 'logo'>; height?: number }) {
  if (!team.mark) {
    return (
      <View style={styles.row}>
        <Image source={team.logoDark || team.logo} style={{ width: height, height }} contentFit="contain" />
        <Text style={styles.name} numberOfLines={1}>{team.name}</Text>
      </View>
    );
  }
  // Lettering is wide and short, so it gets a wider, shorter box than a round emblem.
  const box = WORDMARK_TEAMS.has(team.abbreviation) ? { w: height * 2.1, h: height * 0.75 } : { w: height, h: height };
  const { side, w, h } = fitMark(team.abbreviation, box);
  // The image is the full square; the wrapper is only as big as the artwork, and the square is centered on it.
  return (
    <View style={styles.row}>
      <View style={{ width: w, height: h }} accessible accessibilityLabel={team.name}>
        <Image
          source={team.mark}
          contentFit="contain"
          style={{ position: 'absolute', width: side, height: side, left: (w - side) / 2, top: (h - side) / 2 }}
        />
      </View>
      <Text style={styles.name} numberOfLines={1}>{team.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
});
