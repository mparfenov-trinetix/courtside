import { useEffect } from 'react';
import { Dimensions, type LayoutChangeEvent } from 'react-native';

// What the root view actually measures (native layout), which is the truth about the window.
let rootSize: { width: number; height: number } | null = null;

const differs = (a: number, b: number) => Math.abs(a - b) > 1;

/** Makes `Dimensions` say what the root view measures; a no-op when it already does. */
function syncWindowSize() {
  if (!rootSize) return;
  const window = Dimensions.get('window');
  if (!differs(window.width, rootSize.width) && !differs(window.height, rootSize.height)) return;
  const screen = Dimensions.get('screen');
  // The screen keeps its own size, only turned the way the root is.
  const turned = screen.width > screen.height !== rootSize.width > rootSize.height;
  Dimensions.set({
    window: { ...window, width: rootSize.width, height: rootSize.height },
    screen: turned ? { ...screen, width: screen.height, height: screen.width } : screen,
  });
}

/**
 * Keeps React Native's window size true to the app's layout. The app is locked to portrait, but a video taken full screen out of a WebView
 * (YouTube's embed) is played by iOS's own player, which turns the phone to landscape and back while the app is not active. React Native
 * reports a turn of the phone to JS only while the app is active, so the way back is lost and `Dimensions` keeps the landscape size for
 * good: everything sized from the window's width (a video's card, the logos of a game page, the team screens' backdrop) is stretched
 * until the app restarts. The root view's own layout never left portrait, so it is the one to believe: every report of a new size is
 * checked against it a moment later, and `Dimensions` is set right when they disagree (`Dimensions.set` is what React Native's own event
 * calls, so every `useWindowDimensions` redraws). Returns the `onLayout` for the root view.
 */
export function useWindowSizeGuard(): (event: LayoutChangeEvent) => void {
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => setTimeout(syncWindowSize, 250));
    return () => sub.remove();
  }, []);
  return (event) => {
    rootSize = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height };
    syncWindowSize();
  };
}
