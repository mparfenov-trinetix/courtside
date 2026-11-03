import { useEffect } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

/** 0 -> 1 once the chart has been measured, so a line can draw itself in on first show. */
export function useDrawIn(ready: boolean, duration = 900) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (ready) progress.set(withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [ready, duration, progress]);
  return progress;
}

/** Length of a polyline, with a little slack so a dash pattern never leaves a gap at the end. */
export function polylineLength(points: { x: number; y: number }[]) {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return len * 1.02 + 2;
}
