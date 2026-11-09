import { Pressable, StyleSheet, Text } from 'react-native';

import { InfoIcon } from '@/components';
import { fonts, palette, withAlpha } from '@/lib/theme';

/** "Legend ⓘ" in the corner of the table's header: opens the box score legend. */
export function LegendButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel="Box score legend" style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}>
      <Text style={styles.text}>Legend</Text>
      <InfoIcon size={14} color={withAlpha(palette.chalk, 0.8)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontFamily: fonts.bodySemi, fontSize: 12, color: withAlpha(palette.chalk, 0.8) },
});
