import { StyleSheet, View } from 'react-native';

import { ErrorState, ListSkeleton, ScreenHeader } from '@/components';
import { useLeagueTeamStats, useTeams } from '@/hooks';
import { TEAM_METRICS } from '@/lib/league';
import { palette } from '@/lib/theme';
import { useScreenTeamStore } from '@/state';
import { StatPager } from '../../components';
import { BpiPage } from './BpiPage';
import { MetricPage } from './MetricPage';
import { OddsPage } from './OddsPage';
import { TAB_LABEL } from './constants';

/** The pager's pages: ESPN's power index, the sportsbook's title odds, then one page per team stat. */
const PAGES: { key: string; label: string; metric?: (typeof TEAM_METRICS)[number] }[] = [
  { key: 'bpi', label: 'BPI' },
  { key: 'odds', label: 'Odds' },
  ...TEAM_METRICS.map((m) => ({ key: m.key as string, label: TAB_LABEL[m.key] ?? m.short, metric: m })),
];

/**
 * Every team ranked by one stat, a `StatPager` like League Leaders: swipe sideways, or tap a pill. The stat on screen is drawn at once; the
 * pages next to it (thirty logo rows each, and the power index's own request) once the slide in from the menu is over.
 */
export function TeamLeadersScreen() {
  const currentTeamId = useScreenTeamStore((s) => s.currentTeamId);
  const { data: rows, isPending, error, refetch } = useLeagueTeamStats();
  const { data: teams } = useTeams();

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      <ScreenHeader title="Team leaders" color={palette.chalk} />
      <StatPager
        pages={PAGES}
        defaultKey="ppg"
        fallback={isPending ? <ListSkeleton count={10} /> : error ? <ErrorState message={error.message} onRetry={refetch} /> : undefined}
        renderPage={(key, width) => {
          const item = PAGES.find((p) => p.key === key)!;
          return item.metric ? (
            <MetricPage metric={item.metric} rows={rows ?? []} teams={teams} currentTeamId={currentTeamId} width={width} />
          ) : key === 'odds' ? (
            <OddsPage teams={teams} currentTeamId={currentTeamId} width={width} />
          ) : (
            <BpiPage teams={teams} currentTeamId={currentTeamId} width={width} />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
