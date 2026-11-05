import { Platform } from 'react-native';

import type { Game, Team, TeamDetail } from '@/lib/espn';
import { teamTheme } from '@/lib/theme';
import { shareLogos } from './logos';
import { buildFixturesProps, buildFormProps, buildLockProps } from './snapshots';
import { buildTimeline, type LiveScore } from './timeline';
import type { WatchlistProps } from './watchlist-widget';

/**
 * Push the selected team's fixtures, form and upcoming games to the iOS widgets. Safe everywhere: where the native module doesn't exist
 * (Expo Go, web, Android) the require throws and this quietly does nothing.
 */
export async function syncWidgets(team: Team, detail: TeamDetail | undefined, schedule: Game[], live?: LiveScore) {
  if (Platform.OS !== 'ios') return;
  try {
    // Loaded lazily: importing expo-widgets resolves a native module, which a plain Expo Go build lacks.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widget = (require('./next-game-widget') as typeof import('./next-game-widget')).default;
    const entries = buildTimeline(team, detail, schedule, teamTheme(team), new Date(), live);
    const files = await shareLogos(entries.flatMap((e) => [e.props.logo, e.props.oppLogo]));
    widget.updateTimeline(
      entries.map((e) => ({ ...e, props: { ...e.props, logo: files[e.props.logo] ?? '', oppLogo: files[e.props.oppLogo] ?? '' } })),
    );

    // The other two widgets show one picture at a time, so a snapshot is enough.
    const theme = teamTheme(team);
    const form = buildFormProps(team, detail, schedule, theme);
    const fixtures = buildFixturesProps(team, schedule, theme);
    const shared = await shareLogos([form.logo, ...fixtures.games.map((g) => g.oppLogo)]);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./team-form-widget') as typeof import('./team-form-widget')).default.updateSnapshot({ ...form, logo: shared[form.logo] ?? '' });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./fixtures-widget') as typeof import('./fixtures-widget')).default.updateSnapshot({
      ...fixtures,
      logo: shared[fixtures.logo] ?? '',
      games: fixtures.games.map((g) => ({ ...g, oppLogo: shared[g.oppLogo] ?? '' })),
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./lock-screen-widget') as typeof import('./lock-screen-widget')).default.updateSnapshot(buildLockProps(team, detail, schedule));
  } catch {
    // No widget support in this build.
  }
}

/** Push the starred games and players to the Watchlist widget. Safe everywhere, like `syncWidgets`. */
export async function syncWatchlistWidget(props: WatchlistProps) {
  if (Platform.OS !== 'ios') return;
  try {
    // Widgets can't fetch: logos and headshots are downloaded once into the shared widget folder and passed as file URIs.
    const files = await shareLogos([...props.games.flatMap((g) => [g.awayLogo, g.homeLogo]), ...props.players.map((p) => p.avatar)]);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./watchlist-widget') as typeof import('./watchlist-widget')).default.updateSnapshot({
      games: props.games.map((g) => ({ ...g, awayLogo: files[g.awayLogo] ?? '', homeLogo: files[g.homeLogo] ?? '' })),
      players: props.players.map((p) => ({ ...p, avatar: files[p.avatar] ?? '' })),
    });
  } catch {
    // No widget support in this build.
  }
}
