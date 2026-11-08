import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Pill } from '@/components';
import { useDrafteeIdentity } from '@/hooks';
import type { NbaDraft, Team } from '@/lib/espn';
import { fontSize, fonts, palette, radius, space, surfaces, withAlpha } from '@/lib/theme';
import { openDraftPlayer } from '../../utils/openDraftPlayer';

/** The class's heading: the year, how many were picked and how many came from abroad, and the first pick (a tap opens him). */
export function DraftHero({ draft, teamOf }: { draft: NbaDraft; teamOf: (id: string) => Team | undefined }) {
  const first = draft.picks.find((p) => p.overall === 1);
  const player = first?.player;
  const who = useDrafteeIdentity(player);
  const team = first ? teamOf(first.teamId) : undefined;
  const made = draft.picks.filter((p) => p.player);
  const abroad = made.filter((p) => !p.player?.college).length;
  return (
    <Card tone="raised" radius={radius.xl} style={styles.card}>
      <Text style={styles.kicker}>NBA Draft</Text>
      <Text style={styles.year}>{draft.season}</Text>
      <Text style={styles.sub}>{made.length} picks{abroad ? ` · ${abroad} from abroad or straight from high school` : ''}</Text>
      {first && player ? (
        <Pressable
          onPress={() => openDraftPlayer(player, who.id)}
          accessibilityRole="button"
          accessibilityLabel={`First pick ${player.name}`}
          style={({ pressed }) => [styles.first, pressed && { opacity: 0.7 }]}>
          <View style={styles.photo}>
            {who.headshot ? (
              <Image source={who.headshot} style={styles.headshot} contentFit="cover" contentPosition="top" transition={150} />
            ) : player.logo ? (
              <View style={styles.badge}>
                <Image source={player.logo} style={styles.logo} contentFit="contain" />
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Pill tone="gold" style={{ alignSelf: 'flex-start' }}>NO. 1 PICK</Pill>
            <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
            <Text style={styles.team} numberOfLines={1}>{[team?.displayName, player.college].filter(Boolean).join(' · ')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: space.lg, marginTop: space.sm, marginBottom: space.sm, gap: space.xs },
  kicker: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.gold, letterSpacing: 0.6, textTransform: 'uppercase' },
  year: { fontFamily: fonts.display, fontSize: 64, lineHeight: 68, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: fontSize.small, color: palette.muted },
  first: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  photo: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: surfaces.raised },
  headshot: { width: 56, height: 56 },
  badge: { width: 56, height: 56, borderRadius: 28, backgroundColor: withAlpha('#FFFFFF', 0.94), alignItems: 'center', justifyContent: 'center' },
  logo: { width: 38, height: 38 },
  name: { fontFamily: fonts.displayBold, fontSize: fontSize.title, color: palette.chalk, marginTop: space.xs },
  team: { fontFamily: fonts.body, fontSize: fontSize.small, color: palette.muted },
  chevron: { fontSize: 22, color: palette.muted },
});
