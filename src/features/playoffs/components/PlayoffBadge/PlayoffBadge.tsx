import { StyleSheet, Text, View } from 'react-native';

import { playoffTag } from '@/lib/league';
import { fonts, withAlpha } from '@/lib/theme';

const ORANGE = '#FB923C';

/**
 * A small tag for a playoff or play-in game with its round and game ("WCF · G2", "FINALS · G4", "PLAY-IN"), as the Cup has its "CUP"
 * tag. Nothing for a note that is neither.
 */
export function PlayoffBadge({ note }: { note?: string | null }) {
  const tag = playoffTag(note);
  if (!tag) return null;
  return (
    <View style={styles.badge} accessibilityLabel={note ?? tag}>
      <Text style={styles.text}>{tag}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: withAlpha(ORANGE, 0.16) },
  text: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.6, color: ORANGE },
});
