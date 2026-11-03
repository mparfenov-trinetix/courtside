import { Platform } from 'react-native';

import type { Game, Team, TeamDetail } from '@/lib/espn';
import { teamTheme } from '@/lib/theme';
import { shareLogos } from '@/widgets/logos';
import { buildTimeline } from '@/widgets/timeline';

/**
 * Push the selected team's fixtures to the iOS widget. Safe everywhere: where the native module doesn't exist
 * (Expo Go, web, Android) the require throws and this quietly does nothing.
 */
export async function syncNextGameWidget(team: Team, detail: TeamDetail | undefined, schedule: Game[]) {
  if (Platform.OS !== 'ios') return;
  try {
    // Loaded lazily: importing expo-widgets resolves a native module, which a plain Expo Go build lacks.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widget = (require('@/widgets/next-game-widget') as typeof import('@/widgets/next-game-widget')).default;
    const entries = buildTimeline(team, detail, schedule, teamTheme(team));
    const files = await shareLogos(entries.flatMap((e) => [e.props.logo, e.props.oppLogo]));
    widget.updateTimeline(
      entries.map((e) => ({ ...e, props: { ...e.props, logo: files[e.props.logo] ?? '', oppLogo: files[e.props.oppLogo] ?? '' } })),
    );
  } catch {
    // No widget support in this build.
  }
}
