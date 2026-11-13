import { Image } from 'expo-image';
import type { Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSpotlight } from '@/components';
import type { CupGroup, CupRow } from '@/lib/league';
import { fonts, palette, withAlpha, surfaces } from '@/lib/theme';
import { openDetail } from '@/navigation';
import { GREEN, GOLD } from './constants';

/** One Cup group: five teams ranked, with who would advance if the group ended now. */
export function GroupCard({ group, favoriteTeamId }: { group: CupGroup; favoriteTeamId?: string | null }) {
  return (
    <Animated.View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{group.label}</Text>
        <Text style={[styles.col, styles.colW]}>W-L</Text>
        <Text style={[styles.col, styles.colPd]}>PD</Text>
        <Text style={[styles.col, styles.colLeft]}>LEFT</Text>
      </View>
      {group.rows.map((r, i) => (
        <Row key={r.teamId} row={r} mine={r.teamId === favoriteTeamId} last={i === group.rows.length - 1} />
      ))}
    </Animated.View>
  );
}

function Row({ row, mine, last }: { row: CupRow; mine: boolean; last: boolean }) {
  // A team of the game you came from.
  const spot = useSpotlight()(row.teamId);
  const tint = row.position === 'leader' ? GREEN : row.position === 'wildcard' ? GOLD : null;
  return (
    <Pressable
      onPress={() => openDetail(`/team/${row.teamId}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${row.abbr}, ${row.w} and ${row.l}${row.position === 'leader' ? ', group leader' : row.position === 'wildcard' ? ', wild card position' : ''}`}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowBorder,
        mine && { backgroundColor: surfaces.raised },
        spot && { backgroundColor: withAlpha(palette.chalk, 0.16) },
        pressed && { opacity: 0.7 },
      ]}>
      <View style={[styles.bar, { backgroundColor: tint ?? 'transparent' }]} />
      <Text style={styles.rank}>{row.rank}</Text>
      {row.logo ? <Image source={row.logo} style={styles.logo} contentFit="contain" /> : <View style={styles.logo} />}
      <View style={styles.name}>
        <Text style={styles.abbr}>{row.abbr}{mine ? '  ★' : ''}</Text>
        {tint ? <Text style={[styles.tag, { color: tint }]}>{row.position === 'leader' ? 'GROUP LEADER' : 'WILD CARD'}</Text> : null}
      </View>
      <Text style={[styles.val, styles.colW]}>{row.w}-{row.l}</Text>
      <Text style={[styles.val, styles.colPd, { color: row.diff > 0 ? GREEN : row.diff < 0 ? palette.loss : palette.muted }]}>
        {row.diff > 0 ? '+' : ''}{row.diff}
      </Text>
      <Text style={[styles.val, styles.colLeft, { color: palette.muted }]}>{row.left}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, backgroundColor: surfaces.card, overflow: 'hidden', marginBottom: 12 },
  // Same gap and right padding as a row, so the column titles sit exactly over their values.
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 14, paddingTop: 12, paddingBottom: 6 },
  title: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: palette.chalk, letterSpacing: 0.4 },
  col: { fontFamily: fonts.bodySemi, fontSize: 10, color: palette.muted, letterSpacing: 0.5, textAlign: 'right' },
  colW: { width: 46 },
  colPd: { width: 44 },
  colLeft: { width: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingRight: 14, paddingLeft: 0 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(palette.chalk, 0.08) },
  bar: { width: 3, alignSelf: 'stretch', borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  rank: { width: 14, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 13, color: palette.muted },
  logo: { width: 28, height: 28 },
  name: { flex: 1 },
  abbr: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  tag: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.6, marginTop: 1 },
  val: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.chalk, textAlign: 'right' },
});
