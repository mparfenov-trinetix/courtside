// Real data for stories: the same recorded ESPN responses the unit tests use, run through the app's
// own normalizers, so stories show what the components look like with genuine numbers.
import gameJson from '../../tests/fixtures/game-final.json';
import teamStatsJson from '../../tests/fixtures/league-team-stats.json';
import {
  normalizeGameSummary,
  normalizeLeagueTeamStats,
  type CareerRow,
  type Game,
  type GameLogEntry,
} from '@/lib/espn';
import { deriveFlow, deriveQuarterStats } from '@/lib/game';
import { matchupColors } from '@/lib/theme';

export const game = normalizeGameSummary(gameJson as never, '401909912');
export const { home, away, plays, winProb, info } = game;
export const { home: homeColor, away: awayColor } = matchupColors(away.team, home.team);

export const flow = deriveFlow(plays, home.team.id, away.team.id);

export const derived = deriveQuarterStats(
  plays,
  [
    { teamId: away.team.id, starterIds: away.starters.map((p) => p.id) },
    { teamId: home.team.id, starterIds: home.starters.map((p) => p.id) },
  ],
  home.team.id,
);

export const teamRows = normalizeLeagueTeamStats(teamStatsJson as never);

/** The same game as if it were in progress: ESPN's live timeout and foul fields, and a "live" status. */
export const liveHome = {
  ...home,
  timeoutsRemaining: 4,
  fouls: { team: 14, period: 3, toGive: 2, bonus: false },
};
export const liveAway = {
  ...away,
  timeoutsRemaining: 2,
  fouls: { team: 18, period: 5, toGive: 0, bonus: true },
};

// A deterministic season for form / splits / career stories.
const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
const OPPONENTS = ['BOS', 'MIA', 'NYK', 'ATL', 'CHI', 'DET', 'MIL', 'IND', 'TOR', 'CLE', 'WAS', 'ORL'];

export const gameLog: GameLogEntry[] = OPPONENTS.map((opp, i) => {
  const win = rand(i + 1) > 0.42;
  const mine = 98 + Math.round(rand(i + 20) * 24);
  const theirs = win ? mine - 2 - Math.round(rand(i + 40) * 14) : mine + 2 + Math.round(rand(i + 60) * 12);
  return {
    gameId: `g${i}`,
    date: `2026-11-${String(2 - Math.floor(i / 8)).padStart(2, '0')}`,
    home: i % 2 === 0,
    opponentId: String(i),
    opponent: opp,
    opponentLogo: '',
    result: win ? 'W' : 'L',
    teamScore: mine,
    opponentScore: theirs,
    min: 30 + Math.round(rand(i + 80) * 8),
    // The most recent games (index 0) run hotter, so the "Hot" badge shows.
    pts: Math.round((i < 5 ? 31 : 22) + (rand(i + 100) - 0.5) * 12),
    reb: Math.round(8 + (rand(i + 120) - 0.5) * 8),
    ast: Math.round(5 + (rand(i + 140) - 0.5) * 6),
    stl: Math.round(rand(i + 160) * 3),
    blk: Math.round(rand(i + 180) * 2),
    to: Math.round(rand(i + 200) * 5),
    pf: Math.round(rand(i + 220) * 4),
    fg: '9-18',
    tp: '2-6',
    ft: '6-7',
  };
});

const stat = (pts: number, reb: number, ast: number): Record<string, string> => ({
  GP: '72', GS: '72', MIN: '34.1', PTS: pts.toFixed(1), REB: reb.toFixed(1), AST: ast.toFixed(1),
  STL: '1.2', BLK: '0.8', TO: '2.9', PF: '2.4', 'FG%': '49.3', '3P%': '37.1', 'FT%': '85.6',
  FG: '9.1-18.4', '3PT': '2.1-5.6', FT: '6.0-7.0',
});

export const careerRows: CareerRow[] = [
  { year: 2023, season: '2022-23', abbr: 'PHI', stats: stat(22.4, 4.4, 5.1) },
  { year: 2024, season: '2023-24', abbr: 'PHI', stats: stat(25.9, 4.6, 6.2) },
  { year: 2025, season: '2024-25', abbr: 'MIA', stats: stat(24.7, 4.3, 6.8) },
  { year: 2025, season: '2024-25', abbr: 'PHI', stats: stat(26.4, 5.1, 6.6) },
  { year: 2025, season: '2024-25', abbr: 'TOT', stats: stat(25.6, 4.7, 6.7) },
  { year: 2026, season: '2025-26', abbr: 'PHI', stats: stat(29.8, 5.4, 7.1) },
];

/** A month of one team's schedule for the calendar stories. */
export const schedule: Game[] = Array.from({ length: 12 }, (_, i) => {
  const date = new Date(2026, 10, 2 + i * 2, 19, 30);
  const played = i < 5;
  const mine = 100 + Math.round(rand(i + 300) * 20);
  const theirs = 100 + Math.round(rand(i + 330) * 20);
  return {
    id: `s${i}`,
    date: date.toISOString(),
    home: i % 2 === 0,
    opponent: ['Boston Celtics', 'Miami Heat', 'New York Knicks', 'Atlanta Hawks', 'Chicago Bulls', 'Detroit Pistons'][i % 6],
    opponentAbbr: OPPONENTS[i % OPPONENTS.length],
    opponentLogo: '',
    opponentId: String(i),
    teamScore: played ? mine : undefined,
    opponentScore: played ? theirs : undefined,
    completed: played,
    result: played ? (mine > theirs ? 'W' : 'L') : undefined,
  };
});
