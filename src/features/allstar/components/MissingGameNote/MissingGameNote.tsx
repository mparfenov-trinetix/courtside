import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components';
import type { AllStarWeekend } from '@/lib/espn';
import { fontSize, fonts, palette, space } from '@/lib/theme';

/** What ESPN lacks of an early All-Star Game: nothing but the MVP (2000, 2001), or the score without a box score (2002). */
export function MissingGameNote({ weekend }: { weekend: AllStarWeekend }) {
  const text =
    weekend.games.length === 0
      ? `ESPN has no record of the ${weekend.season} game itself, only its MVP.`
      : weekend.players.length === 0
        ? `ESPN has the score of the ${weekend.season} game but no box score, so there are no player lines.`
        : null;
  if (!text) return null;
  return (
    <Card tone="faint" style={styles.card}>
      <Text style={styles.text}>{text}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: space.lg, marginTop: space.lg },
  text: { fontFamily: fonts.body, fontSize: fontSize.small, color: palette.muted, lineHeight: 18 },
});
