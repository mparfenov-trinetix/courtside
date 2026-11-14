import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View, type FlatList, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Easing, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { useSceneSettled, useAppWindow, useKeepPagerPlace } from '@/hooks';
import { StatPills } from '../StatPills';
import { JUMP_MS, NEAR } from './constants';

export type StatPage = { key: string; label: string };

/**
 * A strip of stat pills over a sideways pager of pages, one per stat: swipe, or tap a pill. Team Leaders and League Leaders are both this.
 * The strip's glass highlight follows the pager frame by frame; a move of more than `NEAR` stats glides the strip while the pager itself
 * jumps in one step (under a quick dip of the page, so the cut is not seen). The choice lives in the `stat` route param, which links into
 * the screen set. `fallback` takes the pager's place (a skeleton while the data is read, an error); the strip stays.
 */
export function StatPager({
  pages,
  defaultKey,
  renderPage,
  fallback,
}: {
  pages: StatPage[];
  defaultKey: string;
  /** Draws one page, `width` wide (the page's own scrolling lives inside it). */
  renderPage: (key: string, width: number) => ReactNode;
  fallback?: ReactNode;
}) {
  const { width } = useAppWindow();
  const { stat } = useLocalSearchParams<{ stat?: string }>();
  const found = pages.findIndex((p) => p.key === stat);
  const index = found >= 0 ? found : Math.max(0, pages.findIndex((p) => p.key === defaultKey));
  // The stat on screen is drawn at once; the pages next to it once the slide in from the menu is over, so none of it lands inside the slide.
  const settled = useSceneSettled(120);
  const labels = pages.map((p) => p.label);

  const pagerRef = useRef<FlatList>(null);
  // Turned to a new width the pager stays on its stat.
  useKeepPagerPlace(pagerRef, index, width);
  // The page the pager is on or heading to.
  const at = useRef(index);
  // The pager's position as a fractional page: the strip's highlight follows it.
  const page = useSharedValue(index);
  // While a long jump plays the strip is animated here and the pager itself is moved in one step.
  const jumping = useSharedValue(false);
  const dip = useSharedValue(1);
  const onScroll = useAnimatedScrollHandler((e) => {
    if (jumping.get()) return;
    page.set(e.contentOffset.x / width);
  });
  const dipStyle = useAnimatedStyle(() => ({ opacity: dip.get() }));

  // A tap on a pill or a link changed the route param: bring the pager there.
  useEffect(() => {
    const from = at.current;
    if (index === from) return;
    at.current = index;
    if (Math.abs(index - from) > NEAR) {
      jumping.set(true);
      dip.set(withSequence(withTiming(0.3, { duration: 90 }), withTiming(1, { duration: JUMP_MS - 90 })));
      pagerRef.current?.scrollToIndex({ index, animated: false });
      page.set(
        withTiming(index, { duration: JUMP_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) jumping.set(false);
        }),
      );
    } else {
      pagerRef.current?.scrollToIndex({ index, animated: true });
    }
  }, [index, jumping, page, dip]);

  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const to = Math.max(0, Math.min(pages.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (to === at.current) return;
    at.current = to;
    Haptics.selectionAsync();
    router.setParams({ stat: pages[to].key });
  };

  return (
    <>
      <StatPills labels={labels} page={page} selected={index} onSelect={(i) => router.setParams({ stat: pages[i].key })} />
      {fallback ?? (
        <Animated.View style={[styles.pager, dipStyle]}>
          <Animated.FlatList
            ref={pagerRef}
            data={pages}
            horizontal
            pagingEnabled
            keyExtractor={(p) => p.key}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            // The stat on screen and one on each side.
            windowSize={3}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onSettled}
            extraData={settled}
            renderItem={({ item, index: i }) => (i !== index && !settled ? <View style={{ width }} /> : renderPage(item.key, width))}
          />
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pager: { flex: 1 },
});
