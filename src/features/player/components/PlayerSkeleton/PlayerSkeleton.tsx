import { StyleSheet, View } from 'react-native';

import { ListSkeleton, Skeleton, SkeletonGroup } from '@/components';
import { withAlpha } from '@/lib/theme';
import { CARD_RATIO } from '../PlayerCard';

/** The whole player page while the player is still being looked up: card, tabs and a block of stats. */
export function PlayerPageSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <SkeletonGroup style={styles.page}>
      <View style={styles.topBar}>
        <Skeleton width={40} height={40} radius={20} />
        <Skeleton width={110} height={40} radius={20} />
      </View>
      <Skeleton width={cardWidth} height={Math.round(cardWidth * CARD_RATIO)} radius={28} style={styles.card} />
      <View style={styles.tabs}>
        {[56, 56, 52, 40].map((w, i) => (
          <Skeleton key={i} width={w} height={14} />
        ))}
      </View>
      <StatsSkeleton />
    </SkeletonGroup>
  );
}

/** Season tab: averages grid and shooting card. */
export function StatsSkeleton() {
  return (
    <SkeletonGroup style={styles.block}>
      <Skeleton width={84} height={11} />
      <View style={styles.grid}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} width="31%" height={74} radius={14} style={styles.cell} />
        ))}
      </View>
      <Skeleton width={72} height={11} style={{ marginTop: 20 }} />
      <Skeleton height={150} radius={18} />
    </SkeletonGroup>
  );
}

/** Games tab: the bar chart and the first rows of the log. */
export function GameLogSkeleton() {
  return (
    <SkeletonGroup style={styles.block}>
      <Skeleton width={110} height={11} />
      <View style={styles.bars}>
        {[60, 90, 50, 75, 50, 20, 80, 45, 35, 95].map((h, i) => (
          <Skeleton key={i} width={`${8}%`} height={h} radius={6} />
        ))}
      </View>
      <Skeleton width={72} height={11} style={{ marginTop: 20 }} />
      <ListSkeleton count={4} avatar="square" trailing card />
    </SkeletonGroup>
  );
}

/** Career tab: a pinned column and a few rows of numbers. */
export function CareerSkeleton() {
  return (
    <SkeletonGroup style={styles.block}>
      <Skeleton width={190} height={11} />
      {Array.from({ length: 7 }, (_, i) => (
        <View key={i} style={styles.careerRow}>
          <Skeleton width={24} height={24} radius={12} />
          <View style={{ gap: 6 }}>
            <Skeleton width={64} height={13} />
            <Skeleton width={34} height={10} />
          </View>
          <View style={{ flex: 1 }} />
          <Skeleton width={150} height={14} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Info tab: honors, contract and details cards. */
export function InfoSkeleton() {
  return (
    <SkeletonGroup style={styles.block}>
      <Skeleton width={72} height={11} />
      <Skeleton height={86} radius={18} />
      <Skeleton width={72} height={11} style={{ marginTop: 16 }} />
      <Skeleton height={120} radius={18} />
      <Skeleton height={190} radius={18} style={{ marginTop: 16 }} />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { alignSelf: 'center', marginTop: 14 },
  tabs: {
    flexDirection: 'row',
    gap: 28,
    paddingVertical: 18,
    marginTop: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withAlpha('#FFFFFF', 0.1),
  },
  block: { gap: 8, paddingTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flexGrow: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100 },
  careerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52 },
});
