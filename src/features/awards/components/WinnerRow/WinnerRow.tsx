import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AwardWinner, Team } from '@/lib/espn';
import { fontSize, fonts, palette, space, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';

/**
 * One winner: his photo, his name (with the award's name over it when `caption` is given) and the team he played for that season. A tap
 * opens his page (ESPN knows retired players too; a photo ESPN has no file of leaves his initial in the circle).
 */
export function WinnerRow({ winner, team, caption }: { winner: AwardWinner; team?: Team; caption?: string }) {
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/player/[id]', params: { id: winner.id, teamId: team?.id ?? '' } })}
      accessibilityRole="button"
      accessibilityLabel={`${caption ? `${caption}, ` : ''}${winner.name}${team ? `, ${team.displayName}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: surfaces.raised }]}>
      <View style={styles.avatar}>
        <Text style={styles.initial}>{winner.name.charAt(0)}</Text>
        {winner.headshot ? <Image source={winner.headshot} style={styles.headshot} contentFit="cover" contentPosition="top" transition={150} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        {caption ? <Text style={styles.caption} numberOfLines={1}>{caption}</Text> : null}
        <Text style={styles.name} numberOfLines={1}>{winner.name}</Text>
      </View>
      {team ? (
        <View style={styles.team}>
          <Image source={team.logoDark || team.logo} style={styles.teamLogo} contentFit="contain" />
          <Text style={styles.abbr}>{team.abbreviation}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.md },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: surfaces.raised, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.bodySemi, fontSize: fontSize.large, color: palette.muted },
  headshot: { position: 'absolute', top: 0, left: 0, width: 44, height: 44 },
  caption: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.gold, letterSpacing: 0.3 },
  name: { fontFamily: fonts.bodyBold, fontSize: fontSize.large, color: palette.chalk },
  team: { width: 52, alignItems: 'center' },
  teamLogo: { width: 28, height: 28 },
  abbr: { fontFamily: fonts.bodyBold, fontSize: fontSize.micro, color: palette.muted, marginTop: 2 },
});
