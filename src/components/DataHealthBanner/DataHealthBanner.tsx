import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDataIssues } from '@/lib/data-health';
import { fonts, palette, withAlpha } from '@/lib/theme';

/**
 * Shown when ESPN answers but the data doesn't look the way our parsers expect, so a missing number
 * reads as "the source changed" rather than "the app is broken". Dismissing hides that exact set of
 * problems until a different one appears.
 */
export function DataHealthBanner() {
  const insets = useSafeAreaInsets();
  const issues = useDataIssues();
  const [dismissed, setDismissed] = useState('');

  const sources = [...issues.keys()].sort();
  const key = sources.join('|');
  if (sources.length === 0 || key === dismissed) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 12 }]}>
      <Animated.View entering={FadeInUp.duration(250)} exiting={FadeOutDown.duration(200)} style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>ESPN&apos;s data looks different</Text>
          <Text style={styles.body}>
            Some numbers may be missing ({sources.join(', ')}). It usually fixes itself; pull to refresh to retry.
          </Text>
        </View>
        <Pressable onPress={() => setDismissed(key)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss">
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 50 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#2A2410',
    borderWidth: 1,
    borderColor: withAlpha('#FBBF24', 0.5),
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#FBBF24' },
  body: { fontFamily: fonts.body, fontSize: 12, color: withAlpha(palette.chalk, 0.8), marginTop: 2 },
  close: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.muted },
});
