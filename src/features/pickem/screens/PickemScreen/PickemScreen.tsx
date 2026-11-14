import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, ErrorState, PickemIcon, ScreenHeader, SectionLabel } from '@/components';
import { useGamesOnDay, useRefresh, useSceneSettled, useTeams } from '@/hooks';
import type { ScoreboardGame, Team } from '@/lib/espn';
import { localToday } from '@/lib/date';
import { isLocked, isPickableKind, summarizePicks } from '@/lib/league';
import { fonts, fontSize, palette, space, withAlpha } from '@/lib/theme';
import { usePicks } from '@/state';
import { PickGameCard, PickRecord, PickRow } from '../../components';
import { READABLE } from '@/lib/layout';

/** What the page says about where picks live and how the favorite is told. */
const NOTE = "Your picks are kept on this phone only. A pick is final at tip-off; the favorite is ESPN's win chance, or the book's price when there is none.";

/** How many settled picks the history lists before "Show more". */
const HISTORY_STEP = 20;

/**
 * Pick'em: the games of today and tomorrow with a button for each side, the score card of your calls so far, the picks still waiting for
 * a result, and the history. Everything is on this phone; the winners come from the scoreboards the Calendar already reads.
 */
export function PickemScreen() {
  const insets = useSafeAreaInsets();
  const settled = useSceneSettled(150);
  const picks = usePicks();
  const { data: teams } = useTeams();
  const today = useMemo(() => localToday(), []);
  const tomorrow = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), [today]);
  const todays = useGamesOnDay(today, today, settled);
  const tomorrows = useGamesOnDay(tomorrow, today, settled);
  const [shown, setShown] = useState(HISTORY_STEP);
  // Pull to read the scoreboards again (a game's time and score move; the picks themselves are on the phone).
  const refreshControl = useRefresh([['scoreboard']]);

  const summary = useMemo(() => summarizePicks(picks), [picks]);
  const byId = useMemo(() => new Map(picks.map((p) => [p.id, p])), [picks]);

  // A game is listed here while it can still be picked, or when it carries a pick (so a locked call stays in view until it is settled).
  const open = (games?: ScoreboardGame[]) => (games ?? []).filter((g) => isPickableKind(g.kind) && ((!g.completed && !g.inProgress) || byId.has(g.id)));
  const todayGames = open(todays.games);
  const tomorrowGames = open(tomorrows.games);
  const listed = new Set([...todayGames, ...tomorrowGames].map((g) => g.id));

  // The rest of the picks not on today's or tomorrow's list: games further ahead, and games that are over but not yet written down.
  const unlisted = picks.filter((p) => !p.winnerId && !listed.has(p.id));
  const ahead = unlisted.filter((p) => !isLocked(p.date));
  const waiting = unlisted.filter((p) => isLocked(p.date));
  const history = picks.filter((p) => p.winnerId).sort((a, b) => b.date.localeCompare(a.date));
  const loading = !settled || todays.isPending || tomorrows.isPending;
  // Both boards failing is the network, not a day with no games.
  const failed = !loading && !!todays.error && !!tomorrows.error && todayGames.length === 0 && tomorrowGames.length === 0;
  const nothing = !loading && !failed && todayGames.length === 0 && tomorrowGames.length === 0 && picks.length === 0;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Pick'em" color={palette.chalk} />
      <ScrollView refreshControl={refreshControl} showsVerticalScrollIndicator={false} contentContainerStyle={[READABLE, { paddingHorizontal: space.lg, paddingBottom: insets.bottom + 24, gap: space.lg }]}>
        <PickRecord summary={summary} />

        {todayGames.length + tomorrowGames.length > 0 ? <Text style={styles.hint}>Tap a team to pick it · tap the rest of the card to open the game</Text> : null}
        <DaySection title="Today" games={todayGames} teams={teams} />
        <DaySection title="Tomorrow" games={tomorrowGames} teams={teams} />
        {failed ? <ErrorState message="The scoreboards did not load. Your picks are safe on this phone." onRetry={() => void Promise.all([todays.refetch(), tomorrows.refetch()])} /> : null}
        {nothing ? (
          <EmptyState
            icon={<PickemIcon color={withAlpha(palette.chalk, 0.4)} size={40} />}
            title="No games to pick"
            text="Nothing is scheduled for today or tomorrow. You can also pick from any upcoming game's page, in the Calendar."
          />
        ) : null}

        {ahead.length > 0 ? (
          <View style={styles.section}>
            <SectionLabel>Later · {ahead.length}</SectionLabel>
            {ahead.map((p) => (
              <PickRow key={p.id} pick={p} />
            ))}
          </View>
        ) : null}

        {waiting.length > 0 ? (
          <View style={styles.section}>
            <SectionLabel>Waiting for a result · {waiting.length}</SectionLabel>
            {waiting.map((p) => (
              <PickRow key={p.id} pick={p} />
            ))}
          </View>
        ) : null}

        {history.length > 0 ? (
          <View style={styles.section}>
            <SectionLabel>History · {history.length}</SectionLabel>
            {history.slice(0, shown).map((p) => (
              <PickRow key={p.id} pick={p} />
            ))}
            {history.length > shown ? <Button label="Show more" tone="quiet" onPress={() => setShown((n) => n + HISTORY_STEP)} /> : null}
          </View>
        ) : null}

        <Text style={styles.note}>{NOTE}</Text>
      </ScrollView>
    </View>
  );
}

function DaySection({ title, games, teams }: { title: string; games: ScoreboardGame[]; teams?: Team[] }) {
  if (games.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionLabel>
        {title} · {games.length}
      </SectionLabel>
      {games.map((g) => (
        <PickGameCard key={g.id} game={g} teams={teams} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.arena },
  section: { gap: space.sm },
  hint: { fontFamily: fonts.bodySemi, fontSize: fontSize.caption, color: palette.muted },
  note: { fontFamily: fonts.body, fontSize: fontSize.caption, color: palette.muted, textAlign: 'center' },
});
