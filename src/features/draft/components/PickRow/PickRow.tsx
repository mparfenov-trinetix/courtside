import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components';
import { useDrafteeIdentity } from '@/hooks';
import type { NbaDraftPick, Team } from '@/lib/espn';
import { fontSize, fonts, palette, space, surfaces, withAlpha } from '@/lib/theme';
import { openDraftPlayer } from '../../utils/openDraftPlayer';

/**
 * One pick: its number, the player (his photo from 2019 on, else his college's logo or his country's flag), size and college, and the team
 * that made it. A tap opens ESPN's pre-draft scouting report under the row with a way on to his page; a player with no report opens it at once.
 * `mine` outlines the favorite team's picks.
 */
export function PickRow({ pick, team, mine }: { pick: NbaDraftPick; team?: Team; mine?: boolean }) {
  const [open, setOpen] = useState(false);
  const player = pick.player;
  const who = useDrafteeIdentity(player);
  const size = [player?.position, player?.height, player?.weight].filter(Boolean).join(' · ');
  const onPress = () => {
    if (!player) return;
    if (player.scouting) setOpen((o) => !o);
    else openDraftPlayer(player, who.id);
  };
  return (
    <Card padded={false} style={[mine && styles.mine]}>
      <Pressable
        onPress={onPress}
        disabled={!player}
        accessibilityRole="button"
        accessibilityLabel={`Pick ${pick.overall}, ${player?.name ?? 'to be made'}, ${team?.displayName ?? ''}`}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: surfaces.raised }]}>
        <Text style={styles.number}>{pick.overall}</Text>
        <View style={styles.avatar}>
          {who.headshot ? (
            <Image source={who.headshot} style={styles.headshot} contentFit="cover" contentPosition="top" transition={150} />
          ) : player?.logo ? (
            <View style={styles.badge}>
              <Image source={player.logo} style={styles.logo} contentFit="contain" />
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{player?.name ?? 'To be made'}</Text>
          {size ? <Text style={styles.meta} numberOfLines={1}>{size}</Text> : null}
          {player ? <Text style={styles.meta} numberOfLines={1}>{player.college ?? 'From abroad'}</Text> : null}
        </View>
        <View style={styles.team}>
          {team ? <Image source={team.logoDark || team.logo} style={styles.teamLogo} contentFit="contain" /> : <View style={styles.teamLogo} />}
          <Text style={styles.abbr}>{team?.abbreviation ?? ''}</Text>
          {pick.traded ? <Text style={styles.trade} numberOfLines={1}>via trade</Text> : null}
        </View>
      </Pressable>
      {open && player?.scouting ? (
        <View style={styles.report}>
          {player.rank ? <Text style={styles.board}>ESPN big board · #{player.rank}</Text> : null}
          <Text style={styles.scouting} numberOfLines={14}>{player.scouting}</Text>
          <Pressable onPress={() => openDraftPlayer(player, who.id)} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.open}>Open {player.name} ›</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  mine: { borderWidth: 1, borderColor: withAlpha(palette.chalk, 0.4), backgroundColor: surfaces.raised },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.md },
  number: { width: 30, textAlign: 'center', fontFamily: fonts.display, fontSize: fontSize.heading, color: palette.muted },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: surfaces.raised, alignItems: 'center', justifyContent: 'center' },
  // The photo is wider than tall: cropped evenly at the sides, the top kept, as in Search.
  headshot: { width: 48, height: 48 },
  badge: { width: 48, height: 48, borderRadius: 24, backgroundColor: withAlpha('#FFFFFF', 0.94), alignItems: 'center', justifyContent: 'center' },
  logo: { width: 32, height: 32 },
  name: { fontFamily: fonts.bodyBold, fontSize: fontSize.large, color: palette.chalk },
  meta: { fontFamily: fonts.body, fontSize: fontSize.label, color: palette.muted },
  team: { width: 56, alignItems: 'center' },
  teamLogo: { width: 30, height: 30 },
  abbr: { fontFamily: fonts.bodyBold, fontSize: fontSize.label, color: palette.chalk, marginTop: 2 },
  trade: { fontFamily: fonts.body, fontSize: fontSize.micro, color: palette.muted },
  report: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  board: { ...{ fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.gold, letterSpacing: 0.4 }, marginTop: space.md },
  scouting: { fontFamily: fonts.body, fontSize: fontSize.small, color: palette.chalk, lineHeight: 19 },
  open: { fontFamily: fonts.bodySemi, fontSize: fontSize.body, color: palette.chalk, marginTop: space.xs },
});
