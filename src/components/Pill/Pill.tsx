import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fontSize, fonts, palette, surfaces, withAlpha } from '@/lib/theme';

const TONES = {
  /** A neutral tag on the page. */
  muted: { backgroundColor: surfaces.raised, borderColor: palette.line, color: palette.chalk },
  /** A trophy or a best: gold on a dark pill, which reads on every team color (gold on a yellow card vanishes). */
  gold: { backgroundColor: 'rgba(10,10,10,0.6)', borderColor: withAlpha(palette.gold, 0.55), color: palette.gold },
  win: { backgroundColor: withAlpha(palette.win, 0.16), borderColor: withAlpha(palette.win, 0.5), color: palette.win },
  loss: { backgroundColor: withAlpha(palette.loss, 0.16), borderColor: withAlpha(palette.loss, 0.5), color: palette.loss },
} as const;

/**
 * A small tag: a word or two, optionally behind an icon. `on` is the text color of the card it sits on (`theme.onPrimary`): the pill is
 * then frosted in that color so it reads on any team. Otherwise `tone` picks one of the fixed looks.
 */
export function Pill({
  children,
  tone = 'muted',
  on,
  icon,
  style,
}: {
  children?: ReactNode;
  tone?: keyof typeof TONES;
  on?: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const look = on
    ? { backgroundColor: withAlpha(on, 0.14), borderColor: withAlpha(on, 0.3), color: on }
    : TONES[tone];
  return (
    <View style={[styles.pill, icon ? styles.withIcon : null, { backgroundColor: look.backgroundColor, borderColor: look.borderColor }, style]}>
      {icon}
      {children != null && children !== '' ? (
        <Text style={[styles.text, { color: look.color }]} numberOfLines={1}>
          {children}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { height: 24, paddingHorizontal: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' },
  withIcon: { paddingLeft: 7, paddingRight: 9 },
  text: { fontFamily: fonts.bodyBold, fontSize: fontSize.caption, letterSpacing: 0.3 },
});
