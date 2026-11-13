import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { kickoffLabel, parseEspnDate } from '@/lib/date';
import { resultOf, type GamePick } from '@/lib/league';
import { fonts, fontSize, palette, radius, space, surfaces, withAlpha } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { PickBadge } from '@/components';

/** A pick as a line of the list: the two teams (the one you took lit), when it was played, and the result. A tap opens the game. */
export function PickRow({ pick }: { pick: GamePick }) {
  const result = resultOf(pick);
  const when = parseEspnDate(pick.date);
  const date = result === 'pending' ? kickoffLabel(pick.date) : when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <Pressable
      onPress={() => openDetail({ pathname: '/game/[id]', params: { id: pick.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${pick.away.abbr} at ${pick.home.abbr}, you picked ${(pick.teamId === pick.home.id ? pick.home : pick.away).abbr}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
      <Side side={pick.away} on={pick.teamId === pick.away.id} won={pick.winnerId === pick.away.id} />
      <Text style={styles.at}>@</Text>
      <Side side={pick.home} on={pick.teamId === pick.home.id} won={pick.winnerId === pick.home.id} />
      <View style={styles.right}>
        <PickBadge pick={pick} />
        <Text style={styles.date} numberOfLines={1}>{date}</Text>
      </View>
    </Pressable>
  );
}

function Side({ side, on, won }: { side: GamePick['away']; on: boolean; won: boolean }) {
  return (
    <View style={[styles.side, on && { backgroundColor: withAlpha(palette.gold, 0.16) }]}>
      {side.logo ? <Image source={side.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.logo} />}
      <Text style={[styles.abbr, won && { color: palette.chalk }]}>{side.abbr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: surfaces.card },
  side: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs, paddingHorizontal: space.sm, borderRadius: radius.md },
  logo: { width: 24, height: 24 },
  abbr: { fontFamily: fonts.bodyBold, fontSize: fontSize.body, color: withAlpha(palette.chalk, 0.7) },
  at: { fontFamily: fonts.bodySemi, fontSize: fontSize.label, color: palette.muted },
  right: { flex: 1, alignItems: 'flex-end', gap: space.xs },
  date: { fontFamily: fonts.body, fontSize: fontSize.caption, color: palette.muted },
});
