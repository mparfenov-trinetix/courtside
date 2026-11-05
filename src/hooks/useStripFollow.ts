import { useRef } from 'react';
import Animated, {
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * A horizontal strip of pills that follows a pager. `page` is the pager's position as a fractional page; the strip keeps the
 * current page in the middle (clamped at the ends) and moves in exact step with it, frame by frame.
 *
 * The strip is moved by a transform on its content, computed from `page` in the same frame, not by scrolling it: scrolling
 * from a reaction lands a frame behind the pager, which made the highlight appear to speed up and slow down between pills.
 * The scroll offset only changes when you scroll the strip yourself; from where you left it, it eases back to the current page
 * as the pager moves on.
 */
export function useStripFollow({
  page,
  step,
  padding,
  itemWidth,
  count,
  gap,
}: {
  page: SharedValue<number>;
  /** Distance from one pill to the next (width plus gap). */
  step: number;
  /** Space before the first pill. */
  padding: number;
  itemWidth: number;
  count: number;
  gap: number;
}) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const viewWidth = useSharedValue(0);
  const contentWidth = padding * 2 + count * step - gap;

  // Where the strip would put a page in the middle of the view (clamped at the ends).
  const centered = (at: number) => {
    'worklet';
    const x = at * step + padding + itemWidth / 2 - viewWidth.get() / 2;
    return Math.max(0, Math.min(x, contentWidth - viewWidth.get()));
  };

  // The scroll offset as it really is (it only changes when you scroll the strip), and what you left it at.
  const scrollX = useSharedValue(0);
  const userMoving = useSharedValue(false);
  const manual = useSharedValue(false);
  const manualX = useSharedValue(0);
  const manualPage = useSharedValue(0);
  const fadeOver = useSharedValue(1.5);

  // The offset the strip should show at the pager's current position.
  const wanted = () => {
    'worklet';
    const target = centered(page.get());
    if (!manual.get()) return target;
    const weight = Math.max(0, 1 - Math.abs(page.get() - manualPage.get()) / fadeOver.get());
    return target + (manualX.get() - centered(manualPage.get())) * weight;
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.set(e.contentOffset.x);
      if (!userMoving.get()) return;
      manual.set(true);
      manualX.set(e.contentOffset.x);
      manualPage.set(page.get());
      fadeOver.set(1.5);
    },
    onBeginDrag: () => {
      // The strip is shown through a transform: fold it into the real offset first, so the finger takes over without a jump.
      const x = Math.max(0, Math.min(wanted(), contentWidth - viewWidth.get()));
      scrollTo(scrollRef, x, 0, false);
      scrollX.set(x);
      userMoving.set(true);
    },
    onEndDrag: (e) => {
      if (e.velocity?.x === 0) userMoving.set(false);
    },
    onMomentumEnd: () => {
      userMoving.set(false);
    },
  });

  // Once the pager has travelled far enough from where the strip was left, the leftover offset has faded out: drop it.
  useAnimatedReaction(
    () => manual.get() && !userMoving.get() && Math.abs(page.get() - manualPage.get()) >= fadeOver.get(),
    (spent) => {
      if (spent) manual.set(false);
    },
  );

  // The content's shift: what the strip should show, less what the scroll view is really showing.
  // Every shared value it depends on is read here, in the body: the style is only recomputed for values it reads itself, not
  // for ones hidden inside a helper (which left the strip standing still while the pager moved).
  const contentStyle = useAnimatedStyle(() => {
    const at = page.get();
    const view = viewWidth.get();
    const left = scrollX.get();
    const isManual = manual.get();
    const from = manualX.get();
    const fromPage = manualPage.get();
    const over = fadeOver.get();
    if (userMoving.get()) return { transform: [{ translateX: 0 }] };
    const clamp = (x: number) => Math.max(0, Math.min(x, contentWidth - view));
    const target = clamp(at * step + padding + itemWidth / 2 - view / 2);
    let shown = target;
    if (isManual) {
      const fromTarget = clamp(fromPage * step + padding + itemWidth / 2 - view / 2);
      shown = clamp(target + (from - fromTarget) * Math.max(0, 1 - Math.abs(at - fromPage) / over));
    }
    return { transform: [{ translateX: left - shown }] };
  });

  // A tap names the page on the UI thread, where the strip's real position and the pager's are known: the strip eases from
  // where it is to the new page over the whole trip of the pager.
  const tapped = useSharedValue<{ index: number; n: number } | null>(null);
  const taps = useRef(0);
  useAnimatedReaction(
    () => tapped.get(),
    (tap) => {
      if (!tap) return;
      manual.set(true);
      manualX.set(Math.max(0, Math.min(wanted(), contentWidth - viewWidth.get())));
      manualPage.set(page.get());
      fadeOver.set(Math.max(1.5, Math.abs(tap.index - page.get())));
    },
  );
  const tap = (index: number) => {
    taps.current += 1;
    tapped.set({ index, n: taps.current });
  };

  /** Call from the strip's onLayout: remembers its width and opens with `index` in the middle. */
  const layout = (width: number, index: number) => {
    viewWidth.set(width);
    const x = index * step + padding + itemWidth / 2 - width / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, Math.min(x, contentWidth - width)), animated: false });
  };

  return { scrollRef, onScroll, contentStyle, contentWidth, tap, layout };
}
