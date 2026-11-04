import { StyleSheet, Text, View } from 'react-native';

import { fonts, withAlpha } from '@/lib/theme';
import type { Heat } from '@/lib/game';
import { FlameIcon } from '../Icons';

const COLORS = { close: '#FBBF24', clutch: '#F97316' } as const;

/** A small flame tag for a live game that is tight late on: "Close game", "Clutch time" or "Overtime". */
export function HeatBadge({ heat, compact = false }: { heat: Heat; compact?: boolean }) {
  if (heat.level === 'none') return null;
  const color = COLORS[heat.level];
  return (
    <View
      accessible
      accessibilityLabel={heat.label}
      style={[styles.badge, compact && styles.compact, { backgroundColor: withAlpha(color, 0.16) }]}>
      <FlameIcon color={color} size={compact ? 11 : 13} filled />
      <Text style={[styles.text, compact && { fontSize: 9 }, { color }]}>{heat.label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11 },
  compact: { paddingHorizontal: 7, paddingVertical: 2, gap: 3 },
  text: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.6 },
});
