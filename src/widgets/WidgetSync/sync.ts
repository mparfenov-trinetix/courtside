import { Platform } from 'react-native';

import type { Game, Team, TeamDetail, TeamStar } from '@/lib/espn';
import { teamTheme } from '@/lib/theme';
import { buildFixturesProps, buildFormProps, buildLockProps, buildTimeline, type LiveScore, type WatchlistProps } from '@/lib/widgets';
import { shareLogos } from './logos';

/**
 * Push the selected team's fixtures, form and upcoming games to the iOS widgets. Safe everywhere: where the native module doesn't exist
 * (Expo Go, web, Android) the require throws and this quietly does nothing.
 */
export async function syncWidgets(team: Team, detail: TeamDetail | undefined, schedule: Game[], live?: LiveScore, star?: TeamStar | null) {
  if (Platform.OS !== 'ios') return;
  try {
    // Loaded lazily: importing expo-widgets resolves a native module, which a plain Expo Go build lacks.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widget = (require('../NextGameWidget') as typeof import('../NextGameWidget')).NextGameWidget;
    const entries = buildTimeline(team, detail, schedule, teamTheme(team), new Date(), live);
    const files = await shareLogos(entries.flatMap((e) => [e.props.logo, e.props.oppLogo]));
    widget.updateTimeline(
      entries.map((e) => ({ ...e, props: { ...e.props, logo: files[e.props.logo] ?? '', oppLogo: files[e.props.oppLogo] ?? '' } })),
    );

    // The other two widgets show one picture at a time, so a snapshot is enough.
    const theme = teamTheme(team);
    const form = buildFormProps(team, detail, schedule, theme, star);
    const fixtures = buildFixturesProps(team, schedule, theme);
    const shared = await shareLogos([form.logo, form.starAvatar, ...fixtures.games.map((g) => g.oppLogo)]);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('../TeamFormWidget') as typeof import('../TeamFormWidget')).TeamFormWidget.updateSnapshot({ ...form, logo: shared[form.logo] ?? '', starAvatar: shared[form.starAvatar] ?? '' });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('../FixturesWidget') as typeof import('../FixturesWidget')).FixturesWidget.updateSnapshot({
      ...fixtures,
      logo: shared[fixtures.logo] ?? '',
      games: fixtures.games.map((g) => ({ ...g, oppLogo: shared[g.oppLogo] ?? '' })),
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('../LockScreenWidget') as typeof import('../LockScreenWidget')).LockScreenWidget.updateSnapshot(buildLockProps(team, detail, schedule));
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
    (require('../WatchlistWidget') as typeof import('../WatchlistWidget')).WatchlistWidget.updateSnapshot({
      games: props.games.map((g) => ({ ...g, awayLogo: files[g.awayLogo] ?? '', homeLogo: files[g.homeLogo] ?? '' })),
      players: props.players.map((p) => ({ ...p, avatar: files[p.avatar] ?? '' })),
    });
  } catch {
    // No widget support in this build.
  }
}
