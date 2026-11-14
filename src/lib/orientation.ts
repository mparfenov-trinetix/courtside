import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform } from 'react-native';

/**
 * The app is locked to portrait at launch (the `expo-screen-orientation` plugin's `initialOrientation`) because a phone turned sideways by iOS's
 * own video player must not leave the layout stretched (see `lib/window-size`). An iPad (and an iPad app on a Mac) is used in every
 * orientation, so there the lock is lifted once: the app then follows the device, the layout follows the window.
 */
export function allowTabletRotation(): void {
  if (Platform.OS !== 'ios' || !Platform.isPad) return;
  ScreenOrientation.unlockAsync().catch(() => {});
}
