import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { palette, surfaces } from '@/lib/theme';
import { DETAIL_SHRINK_AT, HEADER_H } from './constants';

const INSET = 10;

/**
 * A thin track under the stat columns' names with a thumb that shows how far they have scrolled and how much of them is in view. The view's
 * width is worked out from the table's width and the shrinking player column (the same curve as the column's own), so nothing is measured
 * while scrolling. Hidden when everything fits.
 */
export function ScrollIndicator({ scrollX, tableWidth, contentWidth, full, shrunk }: { scrollX: SharedValue<number>; tableWidth: SharedValue<number>; contentWidth: number; /** The pinned column's width at rest and shrunk. */ full: number; shrunk: number }) {
  const track = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, scrollX.get() / DETAIL_SHRINK_AT));
    const view = tableWidth.get() - (full + (shrunk - full) * t);
    return { opacity: contentWidth > view + 1 ? 1 : 0 };
  });
  const thumb = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, scrollX.get() / DETAIL_SHRINK_AT));
    const view = tableWidth.get() - (full + (shrunk - full) * t);
    const trackWidth = Math.max(0, view - 2 * INSET);
    const width = Math.max(24, trackWidth * Math.min(1, view / contentWidth));
    const progress = Math.min(1, Math.max(0, scrollX.get() / Math.max(1, contentWidth - view)));
    return { width, transform: [{ translateX: progress * (trackWidth - width) }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.track, track]}>
      <Animated.View style={[styles.thumb, thumb]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: { position: 'absolute', left: INSET, right: INSET, top: HEADER_H - 4, height: 3, borderRadius: 2, backgroundColor: surfaces.raised, overflow: 'hidden' },
  thumb: { height: 3, borderRadius: 2, backgroundColor: palette.chalk },
});
