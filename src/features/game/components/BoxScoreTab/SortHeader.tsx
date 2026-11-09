import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { SortDir } from '@/lib/game';
import { fonts, palette } from '@/lib/theme';

/** A column's name, tappable to sort by it; the sorted one is white with a small arrow that hugs it. `boxWidth` centers the name in a box of that width. */
export function SortHeader({
  label,
  active,
  dir,
  onPress,
  style,
  boxWidth,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  boxWidth?: number;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={{ top: 6, bottom: 6 }} accessibilityRole="button" accessibilityLabel={`Sort by ${label}`} style={style}>
      <View style={boxWidth ? { width: boxWidth, alignItems: 'center' } : undefined}>
        <Text style={[styles.header, active && styles.active]}>
          {label}
          {active ? <Text style={styles.arrow}>{dir === 'desc' ? '▾' : '▴'}</Text> : null}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { fontFamily: fonts.bodySemi, fontSize: 11, color: palette.muted, letterSpacing: 0.4 },
  active: { color: palette.chalk, fontFamily: fonts.bodyBold },
  arrow: { fontSize: 9 },
});
