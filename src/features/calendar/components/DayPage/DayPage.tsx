import { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components';
import { useGamesOnDay, useRefresh, useTeam, useTeams } from '@/hooks';
import { involvesTeam, type ScoreboardGame } from '@/lib/espn';
import { fonts, palette, teamTheme } from '@/lib/theme';
import { useTeamStore } from '@/state';
import { GameCard } from '../GameCard';
import { GameCardSkeleton } from '../GameCardSkeleton';

/** One day of the pager: that day's games, the selected team's first, then the live ones, then the rest. */
/**
 * `active`: the pager has come to rest on this day or next to it. Only then does the page read its games and build its cards;
 * a page that is only being scrolled past (a fast swipe through a week) shows still empty cards, so the swipe has nothing to wait for.
 */
export const DayPage = memo(function DayPage({ date, today, width, active }: { date: Date; today: Date; width: number; active: boolean }) {
  const insets = useSafeAreaInsets();
  const currentTeamId = useTeamStore((s) => s.currentTeamId);
  const team = useTeam(currentTeamId);
  const theme = teamTheme(team);
  const { data: teams } = useTeams();
  // The games that start on this day of the device's own calendar (a 02:00 tip-off is that morning's), whichever Eastern
  // scoreboards hold them.
  const { games: onDay, isPending, error, refetch, keys } = useGamesOnDay(date, today, active);
  // Games on a past date are final.
  const refreshControl = useRefresh(keys.map((key) => ['scoreboard', key]), date >= today);

  // The selected team's game first, then the live ones, then the rest by tip-off.
  const games = useMemo(() => {
    const order = (g: ScoreboardGame) => (involvesTeam(g, currentTeamId) ? 0 : g.inProgress ? 1 : 2);
    return onDay && [...onDay].sort((a, b) => order(a) - order(b) || a.date.localeCompare(b.date));
  }, [onDay, currentTeamId]);

  let body;
  if (!active) body = <GameCardSkeleton count={6} inset={false} still />;
  else if (isPending) body = <GameCardSkeleton count={5} inset={false} />;
  else if (error) body = <ErrorState message={error.message} onRetry={refetch} />;
  else if (!games || games.length === 0) {
    body = (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No games</Text>
        <Text style={styles.emptyText}>{date < today ? 'No games were played on this date.' : 'No games scheduled yet.'}</Text>
      </View>
    );
  } else {
    body = games.map((game) => (
      <GameCard key={game.id} game={game} mine={involvesTeam(game, currentTeamId)} accent={theme.accent} abbr={team?.abbreviation} teams={teams} />
    ));
  }

  return (
    <View style={{ width }}>
      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}>
        {body}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  empty: { minHeight: 320, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 32, color: palette.chalk },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: palette.muted, textAlign: 'center' },
});
