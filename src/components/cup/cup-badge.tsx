import { StyleSheet, Text, View } from 'react-native';

import { fonts, withAlpha } from '@/lib/theme';

const GOLD = '#FBBF24';

/** A small "CUP" tag for NBA Cup games, with the stage when there's room. */
export function CupBadge({ stage }: { stage?: string }) {
  return (
    <View style={styles.badge} accessibilityLabel={`NBA Cup${stage ? `, ${stage}` : ''}`}>
      <Text style={styles.text}>{stage && !/group/i.test(stage) ? `CUP · ${stage.toUpperCase()}` : 'CUP'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: withAlpha(GOLD, 0.16) },
  text: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.6, color: GOLD },
});
