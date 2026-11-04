import { StyleSheet, View } from 'react-native';

import { ListSkeleton, Skeleton, SkeletonGroup } from '@/components';
import { withAlpha } from '@/lib/theme';

/** The game page before its data arrives: both teams, the score, a line score, the tabs and the first cards. */
export function GameSkeleton() {
  return (
    <SkeletonGroup style={styles.page}>
      <View style={styles.topBar}>
        <Skeleton width={40} height={40} radius={20} />
      </View>
      <View style={styles.hero}>
        <View style={styles.team}>
          <Skeleton width={52} height={52} radius={26} />
          <Skeleton width={46} height={22} />
        </View>
        <View style={styles.score}>
          <Skeleton width={150} height={36} radius={10} />
          <Skeleton width={60} height={11} />
        </View>
        <View style={styles.team}>
          <Skeleton width={52} height={52} radius={26} />
          <Skeleton width={46} height={22} />
        </View>
      </View>
      <Skeleton height={104} radius={14} />
      <View style={styles.tabs}>
        {[70, 70, 44, 48].map((w, i) => (
          <Skeleton key={i} width={w} height={14} />
        ))}
      </View>
      <ListSkeleton count={3} avatar="round" trailing inset={false} />
      <Skeleton height={200} radius={16} />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20, paddingTop: 12, gap: 14 },
  topBar: { flexDirection: 'row' },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  team: { alignItems: 'center', gap: 10 },
  score: { alignItems: 'center', gap: 8 },
  tabs: {
    flexDirection: 'row',
    gap: 30,
    paddingVertical: 14,
    marginTop: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withAlpha('#FFFFFF', 0.1),
  },
});
