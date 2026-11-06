import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, palette, withAlpha } from '@/lib/theme';

/**
 * What a screen shows when it throws while rendering, instead of taking the whole app down: a message, a way to try again, and a way
 * back to the Team card. (ESPN's data is undocumented: a field that is not there any more is a matter of when, not if.)
 */
export function ScreenError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message} numberOfLines={5}>
        {__DEV__ ? error.message : 'This screen could not be shown. Try again, or go back to the Team card.'}
      </Text>
      <Pressable onPress={retry} accessibilityRole="button" style={styles.primary}>
        <Text style={styles.primaryText}>Try again</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          router.replace('/home');
          retry();
        }}
        accessibilityRole="button"
        hitSlop={10}>
        <Text style={styles.secondary}>Go to the Team card</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.arena, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  title: { fontFamily: fonts.displayBold, fontSize: 30, color: palette.chalk },
  message: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.muted, textAlign: 'center' },
  primary: { marginTop: 6, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, backgroundColor: withAlpha(palette.chalk, 0.12) },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.chalk },
  secondary: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.muted },
});
