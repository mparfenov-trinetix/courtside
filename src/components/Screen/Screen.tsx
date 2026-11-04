import { useNavigation } from 'expo-router';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, MenuIcon } from '../Icons';
import { fonts, palette, withAlpha } from '@/lib/theme';

export function useOpenDrawer() {
  const navigation = useNavigation<DrawerNavigationProp<Record<string, object | undefined>>>();
  return () => navigation.openDrawer();
}

/** Space above and below the header's buttons (plus the status bar), and the height the bar takes in all. */
const HEADER_TOP = 10;
const HEADER_BOTTOM = 14;
export const headerHeight = (statusBar: number) => statusBar + HEADER_TOP + 42 + HEADER_BOTTOM;

/** Room kept free on each side of a centered title: the widest button group (search and favorite) plus the screen margin. */
export const TITLE_INSET = 124;

export function ScreenHeader({
  title,
  color = palette.chalk,
  right,
  onBack,
  centerTitle = false,
}: {
  /** Text, or a custom node (e.g. one that fades in on scroll). */
  title?: ReactNode;
  color?: string;
  right?: ReactNode;
  /** When set, shows a back arrow instead of the drawer menu button (for pushed screens). */
  onBack?: () => void;
  /** Put a custom title node in the middle of the screen (under the Dynamic Island) instead of beside the menu button. */
  centerTitle?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const openDrawer = useOpenDrawer();
  return (
    <View style={[styles.header, { paddingTop: insets.top + HEADER_TOP }]}>
      <Pressable
        onPress={onBack ?? openDrawer}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={onBack ? 'Go back' : 'Open menu'}
        style={({ pressed }) => [styles.iconButton, { backgroundColor: withAlpha('#FFFFFF', pressed ? 0.16 : 0.08) }]}>
        {onBack ? <ArrowLeftIcon color={color} /> : <MenuIcon color={color} />}
      </Pressable>
      {typeof title === 'string' || title == null ? (
        <Text style={[styles.title, { color }]} numberOfLines={1}>
          {title}
        </Text>
      ) : centerTitle ? (
        <>
          <View style={styles.titleNode} />
          {/* Centered on the screen, not on the space left between the buttons; the node gets TITLE_INSET on both sides. */}
          <View pointerEvents="none" style={[styles.centerTitle, { top: insets.top + HEADER_TOP }]}>
            {title}
          </View>
        </>
      ) : (
        <View style={styles.titleNode}>{title}</View>
      )}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

export function IconButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: withAlpha('#FFFFFF', pressed ? 0.16 : 0.08) }]}>
      {children}
    </Pressable>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={palette.chalk} />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.stateTitle}>Couldn’t reach ESPN</Text>
      <Text style={styles.stateText}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: HEADER_BOTTOM,
    gap: 14,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 24,
  },
  titleNode: { flex: 1, justifyContent: 'center' },
  centerTitle: { position: 'absolute', left: TITLE_INSET, right: TITLE_INSET, height: 42, alignItems: 'center', justifyContent: 'center' },
  right: {
    minWidth: 42,
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  stateTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: palette.chalk,
  },
  stateText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.muted,
    textAlign: 'center',
  },
  retry: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: palette.chalk,
  },
  retryText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: palette.arena,
  },
});
