import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { positionName } from '@/lib/game';
import type { LeaderEntry, Team } from '@/lib/espn';
import { fonts, palette } from '@/lib/theme';

/** What the line under a player's name says when it is about him: "Guard · 6' 7"" (position and height), the team's code when the record has neither. */
export function playerBlurb(entry: Pick<LeaderEntry, 'position' | 'height' | 'teamAbbr'>): string {
  return [positionName(entry.position), entry.height].filter(Boolean).join(' · ') || entry.teamAbbr;
}

/**
 * The line under a player's name on the leaders lists: his team's logo, small, then what the screen has to say (his position and height, a
 * game's score...). The logo says which team, so the code is not written.
 */
export function PlayerLine({ team, children }: { team?: Team; children: ReactNode }) {
  return (
    <View style={styles.row}>
      {team ? <Image source={team.logoDark || team.logo} style={styles.logo} contentFit="contain" /> : null}
      <Text style={styles.text} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  logo: { width: 16, height: 16 },
  text: { flexShrink: 1, fontFamily: fonts.body, fontSize: 13, color: palette.muted },
});
