import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Pill, StarIcon } from '@/components';
import type { AllStarWeekend } from '@/lib/espn';
import { fontSize, fonts, palette, radius, space } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { dayLabel, weekendSeasonLabel } from '../../utils/format';

/** The weekend's heading: the year, where and when it was played, and the All-Star MVP (a tap opens his page; 2000 had two). */
export function WeekendHero({ weekend }: { weekend: AllStarWeekend }) {
  const where = [weekend.venue, weekend.city].filter(Boolean).join(' · ');
  return (
    <Card tone="raised" radius={radius.xl} style={styles.card}>
      <View style={styles.top}>
        <StarIcon size={18} color={palette.gold} filled />
        <Text style={styles.kicker}>NBA All-Star · {weekendSeasonLabel(weekend.season)}</Text>
      </View>
      <Text style={styles.year}>{weekend.season}</Text>
      {where ? <Text style={styles.where} numberOfLines={2}>{where}</Text> : null}
      {weekend.date ? <Text style={styles.when}>{dayLabel(weekend.date)}</Text> : null}
      {weekend.mvps.map((mvp, i) => (
        <Pressable
          key={mvp.id}
          onPress={() => openDetail({ pathname: '/player/[id]', params: { id: mvp.id, teamId: '' } })}
          accessibilityRole="button"
          accessibilityLabel={`All-Star MVP ${mvp.name}`}
          style={({ pressed }) => [styles.mvp, i > 0 && styles.nextMvp, pressed && { opacity: 0.7 }]}>
          <View style={styles.photo}>
            {mvp.headshot ? <Image source={mvp.headshot} style={styles.headshot} contentFit="cover" contentPosition="top" transition={150} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Pill tone="gold" style={{ alignSelf: 'flex-start' }}>ALL-STAR MVP</Pill>
            <Text style={styles.mvpName} numberOfLines={1}>{mvp.name}</Text>
            {mvp.teamName ? <Text style={styles.mvpTeam} numberOfLines={1}>{mvp.teamName}</Text> : null}
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: space.lg, marginTop: space.sm, gap: space.xs },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  kicker: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.gold, letterSpacing: 0.6, textTransform: 'uppercase' },
  year: { fontFamily: fonts.display, fontSize: 64, lineHeight: 68, color: palette.chalk },
  where: { fontFamily: fonts.bodySemi, fontSize: fontSize.body, color: palette.chalk },
  when: { fontFamily: fonts.body, fontSize: fontSize.small, color: palette.muted },
  mvp: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  nextMvp: { marginTop: space.sm, paddingTop: 0, borderTopWidth: 0 },
  photo: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)' },
  headshot: { width: 56, height: 56 },
  mvpName: { fontFamily: fonts.displayBold, fontSize: fontSize.title, color: palette.chalk, marginTop: space.xs },
  mvpTeam: { fontFamily: fonts.body, fontSize: fontSize.small, color: palette.muted },
  chevron: { fontSize: 22, color: palette.muted },
});
