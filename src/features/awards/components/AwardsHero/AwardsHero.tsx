import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Pill } from '@/components';
import { seasonLabel, type SeasonAwards, type Team } from '@/lib/espn';
import { fontSize, fonts, palette, radius, space, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';

/** The season's heading: its years, and the MVP under them (a tap opens his page). */
export function AwardsHero({ awards, teamOf }: { awards: SeasonAwards; teamOf: (id?: string) => Team | undefined }) {
  const mvp = awards.groups.find((g) => g.key === 'major')?.awards.find((a) => a.name === 'MVP')?.winners[0];
  const team = teamOf(mvp?.teamId);
  return (
    <Card tone="raised" radius={radius.xl} style={styles.card}>
      <Text style={styles.kicker}>Season awards</Text>
      <Text style={styles.year}>{seasonLabel(awards.season)}</Text>
      {mvp ? (
        <Pressable
          onPress={() => openDetail({ pathname: '/player/[id]', params: { id: mvp.id, teamId: team?.id ?? '' } })}
          accessibilityRole="button"
          accessibilityLabel={`Most valuable player ${mvp.name}`}
          style={({ pressed }) => [styles.mvp, pressed && { opacity: 0.7 }]}>
          <View style={styles.photo}>{mvp.headshot ? <Image source={mvp.headshot} style={styles.headshot} contentFit="cover" contentPosition="top" transition={150} /> : null}</View>
          <View style={{ flex: 1 }}>
            <Pill tone="gold" style={{ alignSelf: 'flex-start' }}>MVP</Pill>
            <Text style={styles.name} numberOfLines={1}>{mvp.name}</Text>
            {team ? <Text style={styles.team} numberOfLines={1}>{team.displayName}</Text> : null}
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: space.lg, marginTop: space.sm, gap: space.xs },
  kicker: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.gold, letterSpacing: 0.6, textTransform: 'uppercase' },
  year: { fontFamily: fonts.display, fontSize: 56, lineHeight: 60, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: fontSize.small, color: palette.muted },
  mvp: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  photo: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: surfaces.raised },
  headshot: { width: 56, height: 56 },
  name: { fontFamily: fonts.displayBold, fontSize: fontSize.title, color: palette.chalk, marginTop: space.xs },
  team: { fontFamily: fonts.body, fontSize: fontSize.small, color: palette.muted },
  chevron: { fontSize: 22, color: palette.muted },
});
