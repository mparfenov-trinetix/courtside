import type { HeadToHeadGame } from '../espn';

export type HeadToHeadSummary = {
  played: number;
  wins: number;
  losses: number;
  /** Average points for the first team and against it. */
  avgFor: number;
  avgAgainst: number;
  /** Who won the latest game and how many in a row, e.g. { result: 'W', count: 3 }. */
  streak: { result: 'W' | 'L'; count: number } | null;
};

/** Record and scoring over a list of meetings, newest first. */
export function summarizeHeadToHead(games: HeadToHeadGame[]): HeadToHeadSummary {
  const wins = games.filter((g) => g.result === 'W').length;
  const sum = (pick: (g: HeadToHeadGame) => number) => games.reduce((n, g) => n + pick(g), 0);
  let streak: HeadToHeadSummary['streak'] = null;
  if (games.length > 0) {
    const result = games[0].result;
    let count = 0;
    while (count < games.length && games[count].result === result) count++;
    streak = { result, count };
  }
  return {
    played: games.length,
    wins,
    losses: games.length - wins,
    avgFor: games.length ? sum((g) => g.teamScore) / games.length : 0,
    avgAgainst: games.length ? sum((g) => g.opponentScore) / games.length : 0,
    streak,
  };
}
