import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { Team } from '@/lib/espn';
import { fitMark, WORDMARK_TEAMS , fonts, palette } from '@/lib/theme';

/**
 * A team's header mark beside the team name: ESPN's small secondary logo (an alternate emblem), fitted to an exact box
 * from its measured shape so wide and tall artwork come out the same visual size. Teams whose secondary logo is
 * lettering (76ers, Suns, Trail Blazers, Cavaliers, Nets) use their main logo instead.
 */
export function TeamMark({
  team,
  height = 30,
  maxWidth,
}: {
  team: Pick<Team, 'abbreviation' | 'name' | 'mark' | 'logoDark' | 'logo'>;
  height?: number;
  /** The most room the mark and name may take; a long name shrinks to fit instead of being cut off. */
  maxWidth?: number;
}) {
  const rowStyle = styles.row;
  // A long name gets a smaller size chosen up front (not shrunk by the system), so the mark and the name stay one
  // exact-width unit that centers on the screen.
  const nameSize = (markWidth: number) => {
    if (maxWidth == null) return NAME_SIZE;
    const room = maxWidth - markWidth - GAP;
    const natural = team.name.length * NAME_SIZE * CHAR_WIDTH;
    return natural <= room ? NAME_SIZE : Math.max(15, Math.floor((NAME_SIZE * room) / natural));
  };
  // The five teams whose secondary logo is a lettered wordmark use their main logo, like a team with no secondary logo.
  if (!team.mark || WORDMARK_TEAMS.has(team.abbreviation)) {
    return (
      <View style={rowStyle}>
        <Image source={team.logoDark || team.logo} style={{ width: height, height }} contentFit="contain" />
        <Text style={[styles.name, { fontSize: nameSize(height) }]} numberOfLines={1} allowFontScaling={false}>{team.name}</Text>
      </View>
    );
  }
  const { side, w, h } = fitMark(team.abbreviation, { w: height, h: height });
  // The image is the full square; the wrapper is only as big as the artwork, and the square is centered on it.
  return (
    <View style={rowStyle}>
      <View style={{ width: w, height: h }} accessible accessibilityLabel={team.name}>
        <Image
          source={team.mark}
          contentFit="contain"
          style={{ position: 'absolute', width: side, height: side, left: (w - side) / 2, top: (h - side) / 2 }}
        />
      </View>
      <Text style={[styles.name, { fontSize: nameSize(w) }]} numberOfLines={1} allowFontScaling={false}>{team.name}</Text>
    </View>
  );
}

const NAME_SIZE = 24;
const GAP = 8;
/** Average glyph width of the display font as a fraction of its size, measured from rendered names; slightly generous. */
const CHAR_WIDTH = 0.54;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: GAP },
  name: { fontFamily: fonts.display, color: palette.chalk, textAlign: 'center' },
});
