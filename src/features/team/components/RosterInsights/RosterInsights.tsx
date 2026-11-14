import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRosterStats } from '@/hooks';
import type { Player, Team } from '@/lib/espn';
import type { TeamTheme } from '@/lib/theme';
import { READABLE } from '@/lib/layout';
import { openDetail } from '@/navigation';
import { CategoryLeaders } from '../CategoryLeaders';
import { RosterAvailability } from '../RosterAvailability';
import { RosterMakeup } from '../RosterMakeup';
import { StartingFives } from '../StartingFives';
import { TeammateCompare } from '../TeammateCompare';

/**
 * The Insights view of a team's roster: its most used starting fives, the roster ranked by any category (points, rebounds, shooting, age,
 * seasons in the league, height...), how the roster is built, and two teammates side by side. The season numbers are read player by player
 * (cached, shared with the player pages) once this view is open.
 */
export function RosterInsights({
  players,
  team,
  theme,
  header,
  onScroll,
  scrollRef,
}: {
  players: Player[];
  team: Team;
  theme: TeamTheme;
  /** The team's banner: the first thing on the page, scrolling away with it. */
  header?: ReactNode;
  onScroll?: ComponentProps<typeof Animated.ScrollView>['onScroll'];
  scrollRef?: ComponentProps<typeof Animated.ScrollView>['ref'];
}) {
  const insets = useSafeAreaInsets();
  const { statsOf, pending } = useRosterStats(
    players.map((p) => p.id),
    true,
  );
  const open = (p: Player) => openDetail({ pathname: '/player/[id]', params: { id: p.id, teamId: team.id } });

  return (
    <Animated.ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={[READABLE, styles.content, { paddingBottom: insets.bottom + 24 }]}>
      {header ? <View style={styles.headerGap}>{header}</View> : null}
      <View style={styles.section}>
        <StartingFives teamId={team.id} players={players} theme={theme} active />
      </View>
      <RosterAvailability teamId={team.id} theme={theme} onOpen={(id) => openDetail({ pathname: '/player/[id]', params: { id, teamId: team.id } })} />
      <View style={styles.section}>
        <CategoryLeaders players={players} statsOf={statsOf} loading={pending} theme={theme} onOpen={open} />
      </View>
      <View style={styles.section}>
        <RosterMakeup players={players} theme={theme} />
      </View>
      <TeammateCompare players={players} statsOf={statsOf} theme={theme} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  // No gap on the page: the sections that animate their height (the availability card, the category list) carry their own space, so none is left behind.
  content: { padding: 16 },
  section: { marginBottom: 18 },
  // The banner carries 8 pt under it already (it is the head of the list too): 10 more make the page's 18.
  headerGap: { marginBottom: 10 },
});
