import { useMemo, type ReactNode } from 'react';
import { Dimensions, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppWindow } from '@/hooks';
import { palette } from '@/lib/theme';

/** How far down the content must start in an iPad window that has the system's window controls (the three dots) in its top-left corner. */
const WINDOW_CONTROLS_INSET = 40;

/**
 * The shell of the whole app. On a phone, an iPad and any window up to `COLUMN_MAX` wide it is invisible: the app fills the window and the
 * screens adapt to its width (`useAppWindow().regular`). Only a window wider than that (a very big Mac window) gets the app as one full-height
 * column in the middle with the page color on both sides, so rows and pagers never stretch past what they can carry. It follows the window
 * (Split View, Stage Manager, a Mac window dragged wider), because the width comes from `useAppWindow`.
 *
 * It also fixes the top inset of an iPad app that runs in a window (iPadOS 26's windowed apps, an iPad app on a Mac): the window's controls sit
 * over its top-left corner, where the back button and the menu button were, so every screen's `useSafeAreaInsets().top` is made big enough to
 * clear them. Full screen, and on a phone, nothing changes.
 */
export function AppColumn({ children }: { children: ReactNode }) {
  const { width } = useAppWindow();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const screen = Dimensions.get('screen');
  const windowed = Platform.OS === 'ios' && Platform.isPad && (windowWidth < screen.width - 2 || windowHeight < screen.height - 2);
  const top = windowed ? Math.max(insets.top, WINDOW_CONTROLS_INSET) : insets.top;
  const adjusted = useMemo(() => ({ ...insets, top }), [insets, top]);
  return (
    <View style={styles.window}>
      <View style={[styles.column, { width }]}>
        <SafeAreaInsetsContext.Provider value={adjusted}>{children}</SafeAreaInsetsContext.Provider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: { flex: 1, alignItems: 'center', backgroundColor: palette.arena },
  column: { flex: 1, overflow: 'hidden' },
});
