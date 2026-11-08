import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius as radii, space, surfaces, withAlpha, type TeamTheme } from '@/lib/theme';

/**
 * The surface everything sits on. Neutral by default (`tone`: the faint, usual or raised white layer over the dark page); with `team`
 * it is the team's own color, with the team's edge along it, because a black or navy team's card is otherwise lost against its own
 * page. Replaces the hand-written "rounded translucent box" every screen used to make for itself.
 */
export function Card({
  tone = 'card',
  team,
  padded = true,
  radius = radii.lg,
  style,
  ...props
}: {
  tone?: keyof typeof surfaces;
  /** A team-colored card: its primary color and edge. */
  team?: Pick<TeamTheme, 'primary' | 'edge'>;
  /** The usual 16 pt of padding. Off for a card whose rows run edge to edge. */
  padded?: boolean;
  radius?: number;
} & ViewProps) {
  return (
    <View
      {...props}
      style={[
        styles.base,
        { borderRadius: radius, backgroundColor: team ? team.primary : surfaces[tone] },
        team && { borderWidth: 1.5, borderColor: withAlpha(team.edge, 0.5) },
        padded && styles.padded,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  padded: { padding: space.lg },
});
