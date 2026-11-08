import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { fonts, palette, withAlpha, surfaces } from '@/lib/theme';

export type Row = {
  label: string;
  a?: number;
  b?: number;
  fmt: (v: number) => string;
  /** The smaller number wins (turnovers, points allowed). */
  lowerBetter?: boolean;
  /** Small caption under each value, e.g. a league rank. */
  aSub?: string;
  bSub?: string;
};

/** Which side wins a row: 'a', 'b', or null for a tie / missing data. */
export function rowWinner(r: Row): 'a' | 'b' | null {
  if (r.a == null || r.b == null || r.a === r.b) return null;
  const aBetter = r.lowerBetter ? r.a < r.b : r.a > r.b;
  return aBetter ? 'a' : 'b';
}

export function CompareRow({ row, aColor, bColor, delay }: { row: Row; aColor: string; bColor: string; delay: number }) {
  const progress = useSharedValue(0);
  const { a, b } = row;
  useEffect(() => {
    progress.set(0);
    progress.set(withTiming(1, { duration: 650 }));
  }, [a, b, progress]);

  const max = Math.max(Math.abs(a ?? 0), Math.abs(b ?? 0), 0.0001);
  const aFrac = Math.abs(a ?? 0) / max;
  const bFrac = Math.abs(b ?? 0) / max;
  const winner = rowWinner(row);
  const aWins = winner === 'a';
  const bWins = winner === 'b';

  const aStyle = useAnimatedStyle(() => ({ width: `${aFrac * progress.get() * 100}%` }));
  const bStyle = useAnimatedStyle(() => ({ width: `${bFrac * progress.get() * 100}%` }));

  return (
    <Animated.View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={styles.valBox}>
          <Text style={[styles.val, aWins ? { color: palette.chalk } : styles.valDim]}>{a != null ? row.fmt(a) : '–'}</Text>
          {row.aSub ? <Text style={styles.sub}>{row.aSub}</Text> : null}
        </View>
        <Text style={styles.rowLabel}>{row.label}</Text>
        <View style={[styles.valBox, { alignItems: 'flex-end' }]}>
          <Text style={[styles.val, bWins ? { color: palette.chalk } : styles.valDim]}>{b != null ? row.fmt(b) : '–'}</Text>
          {row.bSub ? <Text style={styles.sub}>{row.bSub}</Text> : null}
        </View>
      </View>
      <View style={styles.bars}>
        <View style={[styles.track, { alignItems: 'flex-end' }]}>
          <Animated.View style={[styles.fill, { backgroundColor: aColor, opacity: aWins ? 1 : 0.4, borderTopLeftRadius: 3, borderBottomLeftRadius: 3 }, aStyle]} />
        </View>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { backgroundColor: bColor, opacity: bWins ? 1 : 0.4, borderTopRightRadius: 3, borderBottomRightRadius: 3 }, bStyle]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  valBox: { width: 64 },
  val: { fontFamily: fonts.bodyBold, fontSize: 16 },
  valDim: { color: withAlpha(palette.chalk, 0.5) },
  sub: { fontFamily: fonts.body, fontSize: 10, color: palette.muted, marginTop: -1 },
  rowLabel: { flex: 1, textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  bars: { flexDirection: 'row', gap: 3 },
  track: { flex: 1, height: 6, backgroundColor: surfaces.card, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6 },
});
