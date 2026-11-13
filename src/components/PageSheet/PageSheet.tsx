import { useEffect, useRef, type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, withAlpha } from '@/lib/theme';

/**
 * A sheet that covers most of the screen and slides up over it (the season list, the team switcher, the Compare pickers). On iOS it is the
 * system's own page sheet. Android has no such thing: a full-screen Modal there put the sheet's title and its "Done" under the status bar, so
 * it is drawn by hand: dimmed backdrop (a tap closes), a panel with round top corners that stops below the status bar, a grip, the content
 * (which brings its own padding at the bottom for the navigation bar: `useSafeAreaInsets`), and the back button closes it.
 * `onDismiss` runs once it has closed, on both.
 */
export function PageSheet({ visible, onClose, onDismiss, children }: { visible: boolean; onClose: () => void; onDismiss?: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // Android's Modal has no onDismiss: it is called when `visible` turns off.
  const was = useRef(visible);
  useEffect(() => {
    if (Platform.OS === 'android' && was.current && !visible) onDismiss?.();
    was.current = visible;
  }, [visible, onDismiss]);

  if (Platform.OS === 'ios') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} onDismiss={onDismiss}>
        {children}
      </Modal>
    );
  }
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.panel, { height: height - insets.top - 12 }]}>
          <View style={styles.grip} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: withAlpha('#000000', 0.55) },
  panel: { backgroundColor: palette.arena, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden' },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginTop: 8, backgroundColor: withAlpha(palette.chalk, 0.25) },
});
