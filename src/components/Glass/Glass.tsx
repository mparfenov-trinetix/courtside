import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, Pressable, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { withAlpha } from '@/lib/theme';

/** Dark glass over the app's dark background reads as a hole; a little white keeps it frosted, like the translucent fills it replaces. */
const FROST = withAlpha('#FFFFFF', 0.1);

let supported: boolean | undefined;

/** iOS 26's Liquid Glass is there: the system draws it and the native module is in this build (checked once, never throws). */
export function glassSupported(): boolean {
  if (supported === undefined) {
    try {
      supported = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
    } catch {
      supported = false;
    }
  }
  return supported;
}

/**
 * A surface drawn as Liquid Glass (`expo-glass-effect`) on iOS 26, and as a plain translucent view anywhere else (older iOS,
 * Android, a build without the native module). Give it the shape in `style` (size, `borderRadius`, padding); `fallbackStyle` is
 * applied only to the plain version, for what the glass does by itself (a border, a shadow, a more solid color).
 * It is always the dark variant: the whole app is dark. Glass takes its look from what is behind it, so it is for things that
 * float over content (buttons, pills), not for large panels.
 */
export function Glass({
  style,
  fallbackStyle,
  tint,
  interactive = false,
  children,
  ...rest
}: {
  style?: StyleProp<ViewStyle>;
  fallbackStyle?: StyleProp<ViewStyle>;
  /** Tints the glass (a team's color, say). */
  tint?: string;
  /** The glass reacts to touch like a system button. */
  interactive?: boolean;
} & Omit<ViewProps, 'style'>) {
  if (!glassSupported()) {
    return (
      <View style={[{ backgroundColor: withAlpha('#FFFFFF', 0.1) }, style, fallbackStyle]} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <GlassView glassEffectStyle="regular" colorScheme="dark" tintColor={tint ?? FROST} isInteractive={interactive} style={style} {...rest}>
      {children}
    </GlassView>
  );
}

/**
 * A round (or, with `wide`, pill-shaped) glass button: the header's circles, the game and player pages' back, star and compare
 * buttons. `tint` colors the glass (a team's color); `fallbackColor` is the fill the plain version uses instead, darker while pressed.
 */
export function GlassButton({
  onPress,
  label,
  children,
  size = 40,
  wide = false,
  tint,
  fallbackColor = withAlpha('#FFFFFF', 0.08),
  fallbackPressedColor = withAlpha('#FFFFFF', 0.16),
  hitSlop = 12,
  style,
  selected,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
  size?: number;
  /** Pill shape: as wide as its content, with side padding. */
  wide?: boolean;
  tint?: string;
  fallbackColor?: string;
  fallbackPressedColor?: string;
  hitSlop?: number;
  /** For the press target itself (margins, alignment). */
  style?: StyleProp<ViewStyle>;
  selected?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected == null ? undefined : { selected }}
      style={[{ height: size, borderRadius: size / 2 }, wide ? null : { width: size }, style]}>
      {({ pressed }) => (
        <Glass
          interactive
          tint={tint}
          style={[
            { height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' },
            wide ? { flexDirection: 'row', gap: 8, paddingHorizontal: 14 } : { width: size },
          ]}
          fallbackStyle={{ backgroundColor: pressed ? fallbackPressedColor : fallbackColor }}>
          {children}
        </Glass>
      )}
    </Pressable>
  );
}
