import { useEffect, useRef, type RefObject } from 'react';
import { useWindowDimensions } from 'react-native';

import { appWidthOf, gridColumns, gridItemWidth, isRegularWidth, uiScale } from '@/lib/layout';

/**
 * The size the app is drawn at: `useWindowDimensions`, with the width cut to the column the app lives in (see `lib/layout`). On a phone it is the
 * window. Use this, never `useWindowDimensions`, for anything sized from the width of the screen.
 * `regular` is true on an iPad or a Mac window; `windowWidth` is the real window.
 */
export function useAppWindow() {
  const { width, height } = useWindowDimensions();
  return { width: appWidthOf(width), height, windowWidth: width, regular: isRegularWidth(width) };
}

/**
 * Columns for a list of cards or rows: as many as fit at `min` points each in the app's width less `inset` (the page's side padding, both sides),
 * one on a phone. `itemWidth` is each item's width, for a grid built by hand.
 */
export function useGridColumns(min = 380, inset = 32, gap = 8) {
  const { width } = useAppWindow();
  const available = width - inset;
  const columns = gridColumns(available, min, gap);
  return { columns, gap, itemWidth: gridItemWidth(available, columns, gap) };
}

/** The factor to multiply a phone-drawn size by: 1 on a phone, more on an iPad or a Mac window (see `uiScale`). */
export function useScale(): number {
  const { width } = useWindowDimensions();
  return uiScale(width);
}

/**
 * A pager (a list with `pagingEnabled`) keeps its scroll offset in points, so when the window changes width (an iPad turned, a Mac window
 * dragged, Split View) it would sit between two pages. This puts it back on page `place`, without animation, whenever the width changes.
 */
export function useKeepPagerPlace(ref: RefObject<{ scrollToOffset: (params: { offset: number; animated?: boolean }) => void } | null>, place: number, width: number) {
  const last = useRef(width);
  useEffect(() => {
    if (last.current === width) return;
    last.current = width;
    ref.current?.scrollToOffset({ offset: place * width, animated: false });
  }, [ref, place, width]);
}
