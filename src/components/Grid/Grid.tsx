import { Children, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useGridColumns } from '@/hooks';

/**
 * Children in as many columns as fit (a phone: one, so nothing changes; an iPad or a Mac window: two, three), row by row. `min` is the narrowest
 * a child may be, `inset` the page's side padding in total (both sides), which is what the columns are worked out from.
 */
export function Grid({ children, min = 380, inset = 32, gap = 8, style }: { children: ReactNode; min?: number; inset?: number; gap?: number; style?: StyleProp<ViewStyle> }) {
  const { columns, itemWidth } = useGridColumns(min, inset, gap);
  const items = Children.toArray(children);
  if (columns === 1) return <View style={[{ gap }, style]}>{items}</View>;
  return (
    <View style={[styles.wrap, { gap }, style]}>
      {items.map((child, i) => (
        <View key={i} style={{ width: itemWidth }}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
