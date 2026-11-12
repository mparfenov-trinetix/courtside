import type { BoxScorePlayer, BoxScoreTeam } from '@/lib/espn';
import { combinedOf, pickGameDuel, pointsOf } from '@/lib/game';
import { KeyMatchupView } from '../KeyMatchup';

const side = (t: BoxScoreTeam, p: BoxScorePlayer) => ({
  team: t.team,
  star: { athleteId: p.id, name: p.name, headshot: p.headshot, position: p.position, jersey: p.jersey, ppg: p.stats.PTS ?? '0', rpg: p.stats.REB ?? '0', apg: p.stats.AST ?? '0' },
});

/**
 * A finished game's duel, when it had one (`pickGameDuel`: two players who scored 30+ within 6 points of each other, or 40+ points, rebounds
 * and assists together within 6): the same two face-to-face cards as the key matchup before tip-off, showing the game's own line, with the
 * same entrance. Nothing otherwise, which is most games.
 */
export function GameDuel({ away, home, awayPlayers, homePlayers }: { away: BoxScoreTeam; home: BoxScoreTeam; awayPlayers: BoxScorePlayer[]; homePlayers: BoxScorePlayer[] }) {
  const duel = pickGameDuel(awayPlayers, homePlayers);
  if (!duel) return null;
  const title =
    duel.kind === 'points'
      ? `Scoring duel · ${pointsOf(duel.away)} vs ${pointsOf(duel.home)}`
      : `All-round duel · ${combinedOf(duel.away)} vs ${combinedOf(duel.home)}`;
  return <KeyMatchupView title={title} unit="game" section away={side(away, duel.away)} home={side(home, duel.home)} />;
}
