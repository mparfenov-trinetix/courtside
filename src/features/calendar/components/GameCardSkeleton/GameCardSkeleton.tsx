import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '@/components';
import { palette, withAlpha } from '@/lib/theme';

/** Same measurements as the day view's game row (`GameCard`), so the list does not jump when the games arrive. */
const LOGO = 40;
const MID = 112;

/**
 * Placeholder scoreboard rows for the Calendar day view: logo and two lines each side, score and clock in the middle. `still`: the same
 * rows without the pulse, for pages the pager is only scrolling past (a pulse per page would be work for nothing, but they must look
 * like the real thing, lines and all, not like empty boxes).
 */
export function GameCardSkeleton({ count = 5, inset = true, still = false }: { count?: number; inset?: boolean; still?: boolean }) {
  const rows = Array.from({ length: count }, (_, i) => (
    <View key={i} style={styles.card}>
      <View style={styles.side}>
        <Skeleton width={LOGO} height={LOGO} radius={LOGO / 2} still={still} />
        <View style={styles.lines}>
          <Skeleton width={34} height={13} still={still} />
          <Skeleton width={24} height={9} still={still} />
        </View>
      </View>
      <View style={styles.mid}>
        <Skeleton width={84 + ((i * 7) % 18)} height={24} radius={8} still={still} />
        <Skeleton width={58} height={10} still={still} />
      </View>
      <View style={[styles.side, styles.sideRight]}>
        <View style={[styles.lines, { alignItems: 'flex-end' }]}>
          <Skeleton width={34} height={13} still={still} />
          <Skeleton width={24} height={9} still={still} />
        </View>
        <Skeleton width={LOGO} height={LOGO} radius={LOGO / 2} still={still} />
      </View>
    </View>
  ));
  const wrap = [styles.wrap, !inset && { paddingHorizontal: 0 }];
  return still ? <View style={wrap}>{rows}</View> : <SkeletonGroup style={wrap}>{rows}</SkeletonGroup>;
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    // The height of a real row: about 67pt for a game still to come and 73pt for a finished one, so the average of the two.
    height: 70,
    borderWidth: 1,
    borderColor: withAlpha(palette.chalk, 0.08),
    backgroundColor: withAlpha('#FFFFFF', 0.04),
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  sideRight: { justifyContent: 'flex-end' },
  lines: { gap: 5 },
  mid: { width: MID, alignItems: 'center', gap: 6 },
});
