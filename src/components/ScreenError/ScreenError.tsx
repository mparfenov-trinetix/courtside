import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, palette } from '@/lib/theme';
import { Button } from '../Button';

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
      <Button label="Try again" tone="secondary" onPress={retry} style={styles.retry} />
      <Button
        label="Go to the Team card"
        tone="quiet"
        onPress={() => {
          router.replace('/home');
          retry();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.arena, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  title: { fontFamily: fonts.displayBold, fontSize: 30, color: palette.chalk },
  message: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.muted, textAlign: 'center' },
  retry: { marginTop: 6 },
});
