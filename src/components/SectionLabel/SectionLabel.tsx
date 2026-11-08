import { Text, type TextProps } from 'react-native';

import { textStyle } from '@/lib/theme';

/** The small uppercase label over a card or a list ("SHOOTING"). One look, whatever screen it is on. */
export function SectionLabel({ style, ...props }: TextProps) {
  return <Text accessibilityRole="header" {...props} style={[textStyle.sectionLabel, style]} />;
}
