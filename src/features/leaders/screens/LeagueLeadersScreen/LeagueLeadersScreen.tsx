import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components';
import { useTeams } from '@/hooks';
import { palette } from '@/lib/theme';
import { AwardOdds, BestGames, Efficiency, HotCold, StatPager } from '../../components';
import { LeaderPage } from './LeaderPage';
import { PAGES } from './constants';

/**
 * Players ranked by one stat, a `StatPager` like Team Leaders: swipe sideways, or tap a pill. The category on screen is read at once, its
 * neighbours once the slide in from the menu is over; Hot / Cold, the best games (Courtside Rating), the award odds and efficiency are pages of their own.
 */
export function LeagueLeadersScreen() {
  const { data: teams } = useTeams();

  return (
    <View style={[styles.root, { backgroundColor: palette.arena }]}>
      <ScreenHeader title="Player leaders" color={palette.chalk} />
      <StatPager
        pages={PAGES}
        defaultKey="ppg"
        renderPage={(key, width) => {
          const page = PAGES.find((p) => p.key === key)!;
          return (
            <View style={{ width }}>
              {key === 'form' ? (
                <HotCold teams={teams} />
              ) : key === 'cr' ? (
                <BestGames teams={teams} />
              ) : key === 'odds' ? (
                <AwardOdds />
              ) : key === 'eff' ? (
                <Efficiency teams={teams} />
              ) : (
                <LeaderPage category={page.category!} title={page.full} teams={teams} />
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
