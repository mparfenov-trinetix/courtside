import { StyleSheet, Text, View } from 'react-native';

import { NBA2K_TOP_COUNT, type Nba2kRating } from '@/lib/league';
import { fonts, palette, withAlpha } from '@/lib/theme';
import { tintFor } from './constants';

/** The player's NBA 2K27 overall, as 2K published it: only for the Top 100, the only ratings 2K makes public. */
export function RatingCard({ rating }: { rating: Nba2kRating }) {
  const tint = tintFor(rating.overall);
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>NBA 2K27</Text>
      <View style={[styles.card, { borderColor: withAlpha(tint, 0.45) }]}>
        <View style={[styles.badge, { backgroundColor: withAlpha(tint, 0.16), borderColor: withAlpha(tint, 0.6) }]}>
          <Text style={[styles.overall, { color: tint }]}>{rating.overall}</Text>
          <Text style={[styles.ovr, { color: tint }]}>OVR</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.rank}>#{rating.rank} of {NBA2K_TOP_COUNT}</Text>
          <Text style={styles.sub}>2K&apos;s published Top 100 · launch rating, 2K adjusts it during the season</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  title: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: withAlpha(palette.chalk, 0.55), marginBottom: 8, paddingHorizontal: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: 1, backgroundColor: withAlpha('#FFFFFF', 0.05), padding: 14 },
  badge: { width: 76, height: 76, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  overall: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42 },
  ovr: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4, marginTop: -2 },
  rank: { fontFamily: fonts.display, fontSize: 24, color: palette.chalk },
  sub: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
});
