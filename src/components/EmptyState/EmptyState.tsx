import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { space, textStyle } from '@/lib/theme';

/**
 * What a screen, a tab or a list says when there is nothing to show: a headline, a sentence, optionally an icon above them and an
 * action under them. `placement`: "top" sits near the top of a tab's content, "center" fills its parent and centers.
 */
export function EmptyState({
  title,
  text,
  icon,
  action,
  placement = 'top',
  style,
}: {
  title: string;
  text?: string;
  icon?: ReactNode;
  action?: ReactNode;
  placement?: 'top' | 'center';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[placement === 'center' ? styles.center : styles.top, style]}>
      {icon}
      <Text style={textStyle.emptyTitle}>{title}</Text>
      {text ? <Text style={textStyle.emptyText}>{text}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', paddingTop: 40, paddingHorizontal: space.xxl, gap: space.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: space.sm },
});
