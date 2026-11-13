import type { BoxScorePlayer, GameSummary } from '../espn';
import { gameScore, minutesOf } from '../game/game-score';

const num = (value?: string): number => {
  const n = parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
};

/** Who played: on the box score, with minutes (a name in a finished game's box score who never left the bench has none). */
const played = (p: BoxScorePlayer) => !p.didNotPlay && minutesOf(p.stats) > 0;

export type SeriesLeader = {
  athleteId: string;
  name: string;
  headshot?: string;
  position?: string;
  jersey?: string;
  games: number;
  /** Per-game averages over the series, one decimal, as the cards print them. */
  ppg: string;
  rpg: string;
  apg: string;
};

/**
 * A team's best player over a series: the highest scoring average among those who played in at least half of the games (a player who
 * scored 30 in his only appearance is not the series leader). From the box scores of the games that were played; null when none was.
 */
export function seriesLeader(games: GameSummary[], teamId: string): SeriesLeader | null {
  const done = games.filter((g) => g.completed);
  const totals = new Map<string, { player: BoxScorePlayer; games: number; pts: number; reb: number; ast: number }>();
  for (const g of done) {
    const side = [g.home, g.away].find((t) => t.team.id === teamId);
    for (const p of [...(side?.starters ?? []), ...(side?.bench ?? [])]) {
      if (!played(p)) continue;
      const t = totals.get(p.id) ?? { player: p, games: 0, pts: 0, reb: 0, ast: 0 };
      t.games++;
      t.pts += num(p.stats.PTS);
      t.reb += num(p.stats.REB);
      t.ast += num(p.stats.AST);
      totals.set(p.id, t);
    }
  }
  const need = Math.max(1, Math.ceil(done.length / 2));
  const best = [...totals.values()]
    .filter((t) => t.games >= need)
    .sort((a, b) => b.pts / b.games - a.pts / a.games || b.games - a.games)[0];
  if (!best) return null;
  const avg = (n: number) => (n / best.games).toFixed(1);
  return {
    athleteId: best.player.id,
    name: best.player.name,
    headshot: best.player.headshot,
    position: best.player.position,
    jersey: best.player.jersey,
    games: best.games,
    ppg: avg(best.pts),
    rpg: avg(best.reb),
    apg: avg(best.ast),
  };
}

export type SeriesPerformance = {
  gameId: string;
  teamId: string;
  athleteId: string;
  name: string;
  headshot?: string;
  pts: number;
  reb: number;
  ast: number;
  /** Hollinger's Game Score of that night: what ranks them. */
  score: number;
};

/**
 * The best single-game lines of a series, best first, at most one per player: ranked by Game Score (points, but also how efficiently and what
 * else he did), so 30 points on 25 shots does not beat 27 on 14.
 */
export function bestPerformances(games: GameSummary[], limit = 3): SeriesPerformance[] {
  const lines: SeriesPerformance[] = [];
  for (const g of games) {
    if (!g.completed) continue;
    for (const side of [g.home, g.away]) {
      for (const p of [...side.starters, ...side.bench]) {
        if (!played(p)) continue;
        const score = gameScore(p.stats);
        if (score === undefined) continue;
        lines.push({ gameId: g.id, teamId: side.team.id, athleteId: p.id, name: p.name, headshot: p.headshot, pts: num(p.stats.PTS), reb: num(p.stats.REB), ast: num(p.stats.AST), score });
      }
    }
  }
  const seen = new Set<string>();
  return lines
    .sort((a, b) => b.score - a.score)
    .filter((l) => (seen.has(l.athleteId) ? false : (seen.add(l.athleteId), true)))
    .slice(0, limit);
}
