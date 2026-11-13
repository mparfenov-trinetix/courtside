import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { GameCard } from '@/features/calendar';
import type { ScoreboardGame, Team } from '@/lib/espn';
import type { PickableGame } from '@/lib/league';
import { matchupColors, palette, withAlpha } from '@/lib/theme';
import { usePickChoice } from '../PickButtons';

/** A game as the Pick'em list holds it. */
export const toPickable = (g: ScoreboardGame, teams?: Team[]): PickableGame => ({
  id: g.id,
  date: g.date,
  away: { id: g.away.teamId, abbr: g.away.abbreviation, logo: teams?.find((t) => t.id === g.away.teamId)?.logoDark || g.away.logo },
  home: { id: g.home.teamId, abbr: g.home.abbreviation, logo: teams?.find((t) => t.id === g.home.teamId)?.logoDark || g.home.logo },
});

/**
 * One game to call, as the Calendar's game card with no second row: the two team sides ARE the vote buttons. A tap on a side picks that team
 * (the same side again takes the pick back), a tap anywhere else on the card opens the game. An open side is faintly outlined so it reads as a
 * button; the chosen one is lit in its team's color, green once the game is won and red once lost; at tip-off both lock and the side you did
 * not take steps back. The card's own "PICK NYK" tag still says what you chose.
 */
export function PickGameCard({ game, teams }: { game: ScoreboardGame; teams?: Team[] }) {
  const pickable = toPickable(game, teams);
  const { pick, locked, choose } = usePickChoice(pickable);
  const awayTeam = teams?.find((t) => t.id === game.away.teamId);
  const homeTeam = teams?.find((t) => t.id === game.home.teamId);
  const colors = awayTeam && homeTeam ? matchupColors(awayTeam, homeTeam) : { away: palette.maple, home: palette.maple };

  const wrapSide = (side: 'away' | 'home', node: ReactNode) => {
    const s = pickable[side];
    const chosen = pick?.teamId === s.id;
    const outcome = chosen && pick?.winnerId ? (pick.winnerId === s.id ? palette.win : palette.loss) : null;
    const tone = outcome ?? colors[side];
    return (
      <Pressable
        onPress={() => choose(s)}
        disabled={locked}
        accessibilityRole="button"
        accessibilityState={{ selected: chosen, disabled: locked }}
        accessibilityLabel={`Pick ${s.abbr} to win`}
        style={({ pressed }) => [
          styles.side,
          chosen
            ? { backgroundColor: withAlpha(tone, 0.45), borderColor: tone }
            : locked
              ? { borderColor: 'transparent' }
              : { backgroundColor: withAlpha(palette.chalk, 0.05), borderColor: withAlpha(palette.chalk, 0.16) },
          locked && !chosen && { opacity: 0.55 },
          pressed && { opacity: 0.75 },
        ]}>
        {node}
      </Pressable>
    );
  };

  return <GameCard game={game} mine={false} accent={palette.maple} teams={teams} wrapSide={wrapSide} />;
}

const styles = StyleSheet.create({
  // Grows a little past the card's own padding, so the outline sits around the side without moving it.
  side: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', margin: -6, marginHorizontal: -4, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1.5 },
});
