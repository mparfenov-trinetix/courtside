// Usage: node --experimental-strip-types scripts/validate-quarter-stats.ts <espnGameId>
// Rebuilds each player's full-game line from play-by-play and diffs it against ESPN's box score.
import { deriveQuarterStats, lineToStats, sumPeriods } from '../src/lib/quarter-stats.ts';

const gameId = process.argv[2];
if (!gameId) throw new Error('Pass an ESPN game id');

const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`);
const d = await res.json();

const plays = d.plays.map((p: any) => ({
  id: String(p.id),
  period: p.period?.number ?? 1,
  clockText: p.clock?.displayValue ?? '0:00',
  text: p.text ?? '',
  typeText: p.type?.text ?? '',
  teamId: p.team?.id ? String(p.team.id) : undefined,
  homeScore: p.homeScore ?? 0,
  awayScore: p.awayScore ?? 0,
  scoring: !!p.scoringPlay,
  scoreValue: p.scoreValue ?? 0,
  shooting: !!p.shootingPlay,
  pointsAttempted: p.pointsAttempted ?? 0,
  athleteIds: (p.participants ?? []).map((x: any) => String(x.athlete.id)),
}));
const homeId = String(d.header.competitions[0].competitors.find((c: any) => c.homeAway === 'home').team.id);
const lineups = d.boxscore.players.map((t: any) => ({
  teamId: String(t.team.id),
  starterIds: t.statistics[0].athletes.filter((a: any) => a.starter).map((a: any) => String(a.athlete.id)),
}));

const q = deriveQuarterStats(plays, lineups, homeId);
let bad = 0;
let total = 0;
for (const t of d.boxscore.players) {
  const names: string[] = t.statistics[0].names;
  for (const a of t.statistics[0].athletes) {
    if (a.didNotPlay) continue;
    const mine = lineToStats(sumPeriods(q.players, q.periods, String(a.athlete.id)));
    for (const k of ['PTS', 'REB', 'AST', 'TO', 'STL', 'BLK', '3PT', 'FG', 'FT', 'PF', 'MIN', '+/-']) {
      total++;
      const box = a.stats[names.indexOf(k)];
      const ok = k === 'MIN' ? Math.abs(Number(mine[k]) - Number(box)) <= 1 : String(mine[k]) === String(box);
      if (!ok) {
        bad++;
        console.log(`${a.athlete.displayName} ${k}: derived ${mine[k]} vs box ${box}`);
      }
    }
  }
}
console.log(`${total - bad}/${total} stat lines match`);
