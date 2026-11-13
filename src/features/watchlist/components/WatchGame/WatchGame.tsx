import { Pressable, StyleSheet, Text } from 'react-native';

import { StarIcon } from '@/components';
import { GameCard } from '@/features/calendar';
import { useGameSummary } from '@/hooks';
import type { ScoreboardGame, Team } from '@/lib/espn';
import { fonts, palette, withAlpha } from '@/lib/theme';
import type { WatchedGame } from '@/state';

/**
 * A starred game as the Calendar's scoreboard row (the same card Pick'em uses): the two teams in their colors with the score and where it
 * stands, or the tip-off time. It shows what was saved at once and fills in from the game itself (kept offline once it is final). The game's
 * day and the star that takes it off the list sit on the tags row of the card, where the Calendar puts a game's tags.
 */
export function WatchGame({ game, teams, onRemove }: { game: WatchedGame; teams?: Team[]; onRemove: () => void }) {
  const { data } = useGameSummary(game.id);
  const awayScore = data?.away.score;
  const homeScore = data?.home.score;
  const completed = !!data?.completed;
  const date = data?.info.date ?? game.date;

  const scoreboard: ScoreboardGame = {
    id: game.id,
    date,
    status: data?.status ?? '',
    completed,
    inProgress: !!data?.live,
    away: { teamId: game.away.id, name: game.away.abbr, abbreviation: game.away.abbr, logo: game.away.logo, score: awayScore, winner: completed && (awayScore ?? 0) > (homeScore ?? 0) },
    home: { teamId: game.home.id, name: game.home.abbr, abbreviation: game.home.abbr, logo: game.home.logo, score: homeScore, winner: completed && (homeScore ?? 0) > (awayScore ?? 0) },
    cup: data?.cup,
    kind: data?.kind ?? 'regular',
    note: data?.note,
    series: data?.series,
  };

  const day = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  return (
    <GameCard
      game={scoreboard}
      mine={false}
      accent={palette.gold}
      teams={teams}
      extra={
        <>
          {day ? <Text style={styles.day}>{day}</Text> : null}
          <Pressable
            onPress={onRemove}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${game.away.abbr} at ${game.home.abbr} from watchlist`}>
            <StarIcon color={palette.gold} size={14} filled />
          </Pressable>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  day: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 0.3, color: withAlpha(palette.chalk, 0.6) },
});
