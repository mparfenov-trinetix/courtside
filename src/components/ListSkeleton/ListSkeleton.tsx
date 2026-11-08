import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '../Skeleton';
import { surfaces } from '@/lib/theme';

/** Placeholder rows for any list: an avatar, two lines of text and (optionally) a value on the right. */
export function ListSkeleton({
  count = 8,
  avatar = 'round',
  trailing = true,
  card = true,
  inset = true,
}: {
  count?: number;
  avatar?: 'round' | 'square' | 'none';
  trailing?: boolean;
  /** Each row sits on the same raised card the real rows use. */
  card?: boolean;
  /** Side padding of its own; turn off when the parent already pads. */
  inset?: boolean;
}) {
  return (
    <SkeletonGroup style={[styles.wrap, !inset && { paddingHorizontal: 0 }]}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.row, card && styles.card]}>
          {avatar !== 'none' && <Skeleton width={40} height={40} radius={avatar === 'round' ? 20 : 10} />}
          <View style={styles.text}>
            <Skeleton width={`${48 + ((i * 17) % 30)}%`} height={14} />
            <Skeleton width={`${28 + ((i * 11) % 22)}%`} height={10} />
          </View>
          {trailing && <Skeleton width={42} height={18} radius={6} />}
        </View>
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  card: { borderRadius: 14, backgroundColor: surfaces.card },
  text: { flex: 1, gap: 8 },
});
