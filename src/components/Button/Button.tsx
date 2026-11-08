import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { fontSize, fonts, palette, radius, withAlpha } from '@/lib/theme';

const TONES = {
  /** The one action of a screen: chalk with dark text. */
  primary: { backgroundColor: palette.chalk, color: palette.arena },
  /** An action beside the main one. */
  secondary: { backgroundColor: withAlpha(palette.chalk, 0.12), color: palette.chalk },
  /** A way out, as plain text. */
  quiet: { backgroundColor: 'transparent', color: palette.muted },
} as const;

/** A text button in one of three tones. Replaces the hand-made "Try again" buttons. */
export function Button({
  label,
  onPress,
  tone = 'primary',
  icon,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  tone?: keyof typeof TONES;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const look = TONES[tone];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={tone === 'quiet' ? 10 : 6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.base, tone !== 'quiet' && styles.filled, { backgroundColor: look.backgroundColor }, pressed && { opacity: 0.8 }, style]}>
      {icon}
      <Text style={[styles.text, { color: look.color }, tone === 'quiet' && styles.quiet]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  filled: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.xl + 2 },
  text: { fontFamily: fonts.bodyBold, fontSize: fontSize.large - 1 },
  quiet: { fontFamily: fonts.bodySemi, fontSize: fontSize.body },
});
