import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '../Skeleton';
import { THUMB_H, THUMB_W } from './constants';

/** Placeholders for the row's cards: three thumbnails with a two-line headline, measured like the real ones. */
export function HighlightCardsSkeleton() {
  return (
    <SkeletonGroup style={styles.row}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <Skeleton width={THUMB_W} height={THUMB_H} radius={12} />
          <Skeleton width={THUMB_W - 24} height={10} radius={5} style={styles.line} />
          <Skeleton width={THUMB_W - 80} height={10} radius={5} style={styles.line} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  // Wider than the screen and clipped by it, like the scrolling row it stands in for.
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, overflow: 'hidden' },
  card: { width: THUMB_W },
  line: { marginTop: 6 },
});
