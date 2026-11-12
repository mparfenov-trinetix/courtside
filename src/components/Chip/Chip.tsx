import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type ViewStyle } from 'react-native';

import { Glass, glassSupported } from '../Glass';
import { fonts, palette, withAlpha, surfaces } from '@/lib/theme';

const SIZES = {
  sm: { paddingHorizontal: 12, paddingVertical: 5, radius: 14, fontSize: 12 },
  md: { paddingHorizontal: 14, paddingVertical: 6, radius: 16, fontSize: 13 },
  lg: { paddingHorizontal: 18, paddingVertical: 0, radius: 20, fontSize: 14, height: 40 },
};

type Size = keyof typeof SIZES;

/**
 * A filter / mode chip. Resting chips are a plain faint pill and the chosen one is Liquid Glass (a screenful of chips would be a
 * screenful of native effect views, and the selection is the part worth lighting). `color` tints the chosen chip (a team's or the
 * page's accent); without it the glass is clear. Without glass the chosen chip is a brighter fill with an edge, as it always was.
 * Pass `label` for plain text, or `children` (with `ChipText` for the words) for richer content.
 */
export function Chip({
  active,
  onPress,
  label,
  children,
  size = 'sm',
  color,
  radius,
  style,
  hitSlop = { top: 8, bottom: 8, left: 2, right: 2 },
  role = 'tab',
  accessibilityLabel,
}: {
  active: boolean;
  onPress: () => void;
  label?: string;
  children?: ReactNode;
  size?: Size;
  color?: string;
  radius?: number;
  /** Replaces the size's padding: height, gaps, an image's room. */
  style?: StyleProp<ViewStyle>;
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
  role?: 'tab' | 'button' | 'radio';
  accessibilityLabel?: string;
}) {
  const s = SIZES[size];
  const shape: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s.paddingHorizontal,
    paddingVertical: s.paddingVertical,
    borderRadius: radius ?? s.radius,
    ...('height' in s ? { height: s.height, justifyContent: 'center' } : null),
  };
  const content = children ?? <ChipText active={active} size={size}>{label}</ChipText>;
  const glass = active && glassSupported();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole={role}
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel}>
      {glass ? (
        // Not `interactive`: the system's press effect grows the glass while it is held (no way to tune the size), and in a strip of
        // chips that pushed the chosen one out over the edge of its row.
        <Glass tint={withAlpha(color ?? palette.chalk, color ? 0.45 : 0.22)} style={[shape, style]}>
          {content}
        </Glass>
      ) : (
        <View
          style={[
            shape,
            styles.plain,
            active && {
              backgroundColor: withAlpha(color ?? palette.chalk, color ? 0.22 : 0.14),
              borderColor: withAlpha(color ?? palette.chalk, color ? 0.6 : 0.28),
            },
            style,
          ]}>
          {content}
        </View>
      )}
    </Pressable>
  );
}

/** A chip's words: muted at rest, chalk when chosen. */
export function ChipText({ active, size = 'sm', style, ...props }: { active: boolean; size?: Size } & TextProps) {
  return <Text {...props} style={[styles.text, { fontSize: SIZES[size].fontSize }, active && { color: palette.chalk }, style]} />;
}

const styles = StyleSheet.create({
  plain: { backgroundColor: surfaces.card, borderWidth: 1, borderColor: 'transparent' },
  text: { fontFamily: fonts.bodySemi, color: palette.muted },
});
