import { StyleSheet, Text, View } from 'react-native';

import { Tick } from '@/components/live-flash';
import type { StatBarConfig } from '@/lib/game-model';
import { fonts, palette, withAlpha } from '@/lib/theme';

/** One head-to-head stat: both values, and a bar split by who has more (or less, if lower is better). */
export function TeamStatBar({
  label,
  away,
  home,
  awayText,
  homeText,
  awaySub,
  homeSub,
  lowerIsBetter,
  awayColor,
  homeColor,
}: StatBarConfig & { awayColor: string; homeColor: string }) {
  const total = away + home;
  const awayFrac = total > 0 ? away / total : 0.5;
  const awayWins = lowerIsBetter ? away < home : away > home;
  const homeWins = lowerIsBetter ? home < away : home > away;
  const tie = away === home;
  const hi = withAlpha(palette.chalk, 0.95);
  const lo = withAlpha(palette.chalk, 0.5);

  return (
    <View style={styles.statBar}>
      <View style={styles.row}>
        <View style={styles.side}>
          <Tick style={[styles.val, { color: awayWins || tie ? hi : lo }]} value={awayText} />
          {awaySub ? <Text style={styles.sub}>{awaySub}</Text> : null}
        </View>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.side, { justifyContent: 'flex-end' }]}>
          {homeSub ? <Text style={styles.sub}>{homeSub}</Text> : null}
          <Tick style={[styles.val, { color: homeWins || tie ? hi : lo }]} value={homeText} />
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, styles.awayEnd, { flex: awayFrac, backgroundColor: awayColor, opacity: awayWins || tie ? 1 : 0.35 }]} />
        <View style={[styles.fill, styles.homeEnd, { flex: 1 - awayFrac, backgroundColor: homeColor, opacity: homeWins || tie ? 1 : 0.35 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statBar: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  side: { width: 88, flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  val: { fontFamily: fonts.bodyBold, fontSize: 15 },
  sub: { fontFamily: fonts.body, fontSize: 11, color: palette.muted },
  label: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: palette.muted, textAlign: 'center' },
  track: { height: 5, borderRadius: 3, flexDirection: 'row', overflow: 'hidden', gap: 2 },
  fill: { height: 5 },
  awayEnd: { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 },
  homeEnd: { borderTopRightRadius: 3, borderBottomRightRadius: 3 },
});
