import { useEffect, useState, type ReactNode } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const DURATION = 260;

/**
 * Content that opens and closes by animating its height (and fading), in both directions.
 *
 * Removing content with `{open && …}` drops it in one frame, so the box snaps shorter and, when the
 * list is scrolled to the bottom, the scroll position jumps with it. Here the height shrinks over
 * several frames, so the scroll view follows smoothly. Content is mounted the first time it opens
 * and then kept, so it can animate out.
 */
export function Expandable({ open, children }: { open: boolean; children: ReactNode }) {
  const [everOpened, setEverOpened] = useState(open);
  if (open && !everOpened) setEverOpened(true);

  const progress = useSharedValue(open ? 1 : 0);
  const measured = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(open ? 1 : 0, { duration: DURATION, easing: Easing.out(Easing.cubic) }));
  }, [open, progress]);

  const outer = useAnimatedStyle(() => ({
    height: measured.get() * progress.get(),
    opacity: progress.get(),
  }));

  return (
    <Animated.View style={[{ overflow: 'hidden' }, outer]} pointerEvents={open ? 'auto' : 'none'}>
      {everOpened && (
        // Absolutely positioned so it lays out at its natural height whatever the outer height is.
        <Animated.View
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          onLayout={(e) => measured.set(e.nativeEvent.layout.height)}>
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
}
