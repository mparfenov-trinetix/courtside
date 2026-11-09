import { View } from 'react-native';

import { palette } from '@/lib/theme';

/**
 * The route `/`: only what is under the intro. The intro itself is `IntroOverlay`, drawn above the whole app by the root layout, so the
 * app (the drawer, the home card and the heavy screens) can be built beneath it while it plays.
 */
export function IntroScreen() {
  return <View style={{ flex: 1, backgroundColor: palette.arena }} />;
}
