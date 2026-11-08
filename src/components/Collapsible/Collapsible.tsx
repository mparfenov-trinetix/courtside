import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Expandable } from '../Expandable';
import { ChevronIcon } from '../Icons';
import { fonts, palette, surfaces } from '@/lib/theme';

/** A titled section that starts closed. Opening it fades the content in and turns the chevron. */
export function Collapsible({
  title,
  hint,
  children,
  defaultOpen = false,
}: {
  title: string;
  /** Short text on the right while closed, e.g. "3 injuries". */
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open ? '90deg' : '0deg', { duration: 200 }) }],
  }));

  return (
    <Animated.View style={styles.wrap}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setOpen((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.7 }]}>
        <Text style={styles.title}>{title}</Text>
        {!open && hint ? <Text style={styles.hint}>{hint}</Text> : null}
        <Animated.View style={chevron}>
          <ChevronIcon color={palette.muted} />
        </Animated.View>
      </Pressable>
      <Expandable open={open}>{children}</Expandable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: surfaces.faint, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 14 },
  title: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
});
