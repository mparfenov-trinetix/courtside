import type { Game } from '../espn';

/** How far a team's season went. */
export type SeasonStage = 'missed' | 'play-in' | 'r1' | 'r2' | 'r3' | 'finals' | 'champions';

export type SeasonResult = {
  stage: SeasonStage;
  /** "Lost in the second round", "NBA champions", "Missed the playoffs". */
  label: string;
  /** The last series: "Lost 2-4 to San Antonio Spurs", "Beat Boston Celtics 4-2". */
  detail?: string;
  /** Playoff rounds played, 0 to 4 (the play-in is not a round). */
  rounds: number;
};

const LABELS: Record<SeasonStage, string> = {
  missed: 'Missed the playoffs',
  'play-in': 'Lost in the play-in',
  r1: 'Lost in the first round',
  r2: 'Lost in the second round',
  r3: 'Lost in the conference finals',
  finals: 'Lost in the NBA Finals',
  champions: 'NBA champions',
};

const STAGES: SeasonStage[] = ['missed', 'r1', 'r2', 'r3', 'finals'];

/**
 * How a past season ended for a team, from the games it played (its regular season, play-in and playoffs, which ESPN serves together) and
 * how many of them the standings count (`regularGames`, wins plus losses: the postseason follows the regular season, and before 2009-10 ESPN
 * gives its games no note to tell them by). The play-in games are told by their note; a Cup knockout game is in the schedule but not in the
 * record, so it is left out. The rest after the regular season are the playoffs, split into series by who was played (a team meets another
 * once per postseason), and the k-th series is round k: the last one is where the season ended, won only in the Finals (a title). A season
 * with no playoff game is "missed the playoffs", or "lost in the play-in" when it had play-in games. Null when the record is not known.
 */
export function seasonResult(games: Game[], regularGames: number | undefined, season: number): SeasonResult | null {
  if (!regularGames || regularGames <= 0) return null;
  const played = games
    .filter((g) => g.completed && g.result && !(g.cup && !/group/i.test(g.cup)))
    .sort((a, b) => a.date.localeCompare(b.date));
  // A finished game with no score in ESPN's schedule would move the cut by one and read a first playoff game as the last of the season.
  if (played.length < regularGames) return null;
  const post = played.slice(regularGames);
  const playoffs = post.filter((g) => !(g.note && /play-in/i.test(g.note)));
  const playedPlayIn = post.length > playoffs.length;

  if (playoffs.length === 0) {
    const stage: SeasonStage = playedPlayIn ? 'play-in' : 'missed';
    return { stage, label: LABELS[stage], rounds: 0 };
  }

  const series: { opponent: string; wins: number; losses: number; id: string }[] = [];
  for (const g of playoffs) {
    let current = series[series.length - 1];
    if (!current || current.id !== g.opponentId) {
      current = { id: g.opponentId, opponent: g.opponent, wins: 0, losses: 0 };
      series.push(current);
    }
    if (g.result === 'W') current.wins++;
    else current.losses++;
  }
  const rounds = Math.min(series.length, 4);
  const last = series[series.length - 1];
  // A series is best-of-seven, but the first round was best-of-five until 2002-03.
  const needed = series.length === 1 && season <= 2003 ? 3 : 4;
  const won = last.wins >= needed && last.wins > last.losses;
  const stage: SeasonStage = rounds === 4 && won ? 'champions' : STAGES[rounds];
  const verdict = won ? `Beat ${last.opponent} ${last.wins}–${last.losses}` : `Lost ${last.wins}–${last.losses} to ${last.opponent}`;
  return { stage, label: LABELS[stage], detail: verdict, rounds };
}
