import { StyleSheet, Text, View } from 'react-native';

import { resultOf, type GamePick } from '@/lib/league';
import { fonts, palette, withAlpha } from '@/lib/theme';

/** A small tag for a game you made a call on: "PICK NYK" while it waits, "✓ NYK" when it was right, "✗ NYK" when it was not. */
export function PickBadge({ pick }: { pick?: GamePick }) {
  if (!pick) return null;
  const abbr = (pick.teamId === pick.home.id ? pick.home : pick.away).abbr;
  const result = resultOf(pick);
  const color = result === 'win' ? palette.win : result === 'loss' ? palette.loss : palette.gold;
  const text = result === 'win' ? `✓ ${abbr}` : result === 'loss' ? `✗ ${abbr}` : `PICK ${abbr}`;
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.16) }]} accessibilityLabel={`Your pick: ${abbr}${result === 'pending' ? '' : result === 'win' ? ', right' : ', wrong'}`}>
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  text: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.6 },
});
