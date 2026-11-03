import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CupIcon } from '@/components';
import { useCup } from '@/hooks';
import { fonts, palette, withAlpha } from '@/lib/theme';

const GOLD = '#FBBF24';
const ordinal = (n: number) => ['1st', '2nd', '3rd', '4th', '5th'][n - 1] ?? `${n}th`;

/** Where a team stands in its NBA Cup group; nothing at all for teams not in the Cup or off-season. */
export function MyCupCard({ teamId }: { teamId: string }) {
  const { cup } = useCup();
  const group = cup?.groups.find((g) => g.rows.some((r) => r.teamId === teamId));
  const row = group?.rows.find((r) => r.teamId === teamId);
  if (!cup || !group || !row) return null;

  const status = row.position === 'leader' ? 'Group leader' : row.position === 'wildcard' ? 'Wild card position' : `${ordinal(row.rank)} in the group`;
  const left = row.left === 0 ? 'Group play done' : `${row.left} group game${row.left === 1 ? '' : 's'} left`;

  return (
    <Animated.View entering={FadeInDown.delay(105).duration(300)} style={styles.wrap}>
      <Pressable
        onPress={() => router.navigate('/cup' as Href)}
        accessibilityRole="button"
        accessibilityLabel={`NBA Cup. ${group.label}. ${status}, ${row.w} and ${row.l}.`}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
        <CupIcon color={GOLD} size={26} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>NBA Cup · {group.label}</Text>
          <Text style={styles.status}>{status} · {left}</Text>
        </View>
        <View style={styles.record}>
          <Text style={styles.recordNum}>{row.w}-{row.l}</Text>
          <Text style={styles.recordPd}>{row.diff > 0 ? '+' : ''}{row.diff} PD</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, paddingHorizontal: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: withAlpha(GOLD, 0.08),
    borderWidth: 1,
    borderColor: withAlpha(GOLD, 0.3),
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  status: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, marginTop: 1 },
  record: { alignItems: 'flex-end' },
  recordNum: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  recordPd: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted },
});
