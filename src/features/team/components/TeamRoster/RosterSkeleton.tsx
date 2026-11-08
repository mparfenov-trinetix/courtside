import { StyleSheet, View } from 'react-native';

import { withAlpha, surfaces } from '@/lib/theme';

const ROWS = 7;

/**
 * Placeholder rows for a roster page. Plain views, no animation: several pages hold one at once (every page a jump or a
 * swipe passes), and a pulsing skeleton is dozens of animated views each.
 */
export function RosterSkeleton() {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: ROWS }, (_, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.avatar} />
          <View style={styles.text}>
            <View style={[styles.line, { width: `${46 + ((i * 17) % 28)}%` }]} />
            <View style={[styles.line, styles.short, { width: `${24 + ((i * 11) % 20)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const fill = withAlpha('#FFFFFF', 0.07);
const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 72, padding: 10, borderRadius: 16, backgroundColor: surfaces.faint },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: fill },
  text: { flex: 1, gap: 8 },
  line: { height: 13, borderRadius: 6, backgroundColor: fill },
  short: { height: 10 },
});
