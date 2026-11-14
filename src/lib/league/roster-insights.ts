import type { Player, PlayerSeasonStats } from '../espn';
import { positionGroup, type PositionGroup } from './key-matchup';

/** The ways the Teams screen's Insights view ranks a roster: a season line (from the player's stats) or a fact from the roster itself. */
export type RosterCategoryKey =
  | 'ppg'
  | 'rpg'
  | 'apg'
  | 'spg'
  | 'bpg'
  | 'mpg'
  | 'threePct'
  | 'fgPct'
  | 'ftPct'
  | 'gamesStarted'
  | 'age'
  | 'experience'
  | 'height'
  | 'weight';

export type RosterCategory = {
  key: RosterCategoryKey;
  /** The chip. */
  label: string;
  /** The title of the list. */
  title: string;
  /** Where the number comes from: the player's season stats, or the roster feed (known at once). */
  source: 'stats' | 'roster';
  /** Biggest first (every category here; kept explicit so a smallest-first one can be added). */
  order: 'desc';
};

export const ROSTER_CATEGORIES: RosterCategory[] = [
  { key: 'ppg', label: 'PTS', title: 'Points per game', source: 'stats', order: 'desc' },
  { key: 'rpg', label: 'REB', title: 'Rebounds per game', source: 'stats', order: 'desc' },
  { key: 'apg', label: 'AST', title: 'Assists per game', source: 'stats', order: 'desc' },
  { key: 'spg', label: 'STL', title: 'Steals per game', source: 'stats', order: 'desc' },
  { key: 'bpg', label: 'BLK', title: 'Blocks per game', source: 'stats', order: 'desc' },
  { key: 'mpg', label: 'MIN', title: 'Minutes per game', source: 'stats', order: 'desc' },
  { key: 'threePct', label: '3P%', title: '3-point percentage', source: 'stats', order: 'desc' },
  { key: 'fgPct', label: 'FG%', title: 'Field goal percentage', source: 'stats', order: 'desc' },
  { key: 'ftPct', label: 'FT%', title: 'Free throw percentage', source: 'stats', order: 'desc' },
  { key: 'gamesStarted', label: 'Starts', title: 'Games started', source: 'stats', order: 'desc' },
  { key: 'age', label: 'Age', title: 'Age, oldest first', source: 'roster', order: 'desc' },
  { key: 'experience', label: 'Experience', title: 'Seasons in the league', source: 'roster', order: 'desc' },
  { key: 'height', label: 'Height', title: 'Height, tallest first', source: 'roster', order: 'desc' },
  { key: 'weight', label: 'Weight', title: 'Weight, heaviest first', source: 'roster', order: 'desc' },
];

/** The number a category ranks a player by: undefined when it is not known (no stats yet, a rookie with no games, no listed height). */
export function categoryValue(player: Player, stats: PlayerSeasonStats | undefined, key: RosterCategoryKey): number | undefined {
  switch (key) {
    case 'age':
      return player.age;
    case 'experience':
      return player.experience;
    case 'height':
      return player.heightCm;
    case 'weight':
      return player.weightKg;
    default:
      return stats?.[key];
  }
}

/** Everyone who has a number for the category, biggest first (equal numbers keep roster order). */
export function rankByCategory(
  players: Player[],
  statsOf: (id: string) => PlayerSeasonStats | undefined,
  key: RosterCategoryKey,
): { player: Player; value: number }[] {
  return players
    .flatMap((player, i) => {
      const value = categoryValue(player, statsOf(player.id), key);
      return value == null || Number.isNaN(value) ? [] : [{ player, value, i }];
    })
    .sort((a, b) => b.value - a.value || a.i - b.i)
    .map(({ player, value }) => ({ player, value }));
}

const inches = (cm: number) => cm / 2.54;

/** How a category's number is written: 22.4 points, 48% shooting, 6' 8", 27 years old, a rookie. */
export function formatCategory(key: RosterCategoryKey, value: number): string {
  switch (key) {
    case 'threePct':
    case 'fgPct':
    case 'ftPct':
      // ESPN's percentages arrive as 0-1 once normalized (a few feeds send 48.7); either reads as a whole percent.
      return `${Math.round(value <= 1 ? value * 100 : value)}%`;
    case 'gamesStarted':
      return String(Math.round(value));
    case 'age':
      return String(Math.round(value));
    case 'experience':
      return value <= 0 ? 'Rookie' : `${Math.round(value)} yr${Math.round(value) === 1 ? '' : 's'}`;
    case 'height': {
      const total = Math.round(inches(value));
      return `${Math.floor(total / 12)}' ${total % 12}"`;
    }
    case 'weight':
      return `${Math.round(value / 0.45359237)} lbs`;
    default:
      return value.toFixed(1);
  }
}

/** The share of a bar a value fills: against the biggest in the list, never empty so a small number still shows. */
export function barShare(value: number, max: number): number {
  if (!(max > 0) || !(value > 0)) return 0.04;
  return Math.max(0.04, Math.min(1, value / max));
}

export type RosterMakeup = {
  count: number;
  avgAge?: number;
  youngest?: Player;
  oldest?: Player;
  avgHeightCm?: number;
  avgWeightKg?: number;
  tallest?: Player;
  /** First-year players, and those with ten or more seasons behind them. */
  rookies: number;
  veterans: number;
  avgExperience?: number;
  positions: Record<PositionGroup | 'other', number>;
  /** Players born outside the United States, and how many countries that is. */
  international: number;
  countries: number;
};

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined);

/** What the roster is made of: how old, how tall, how experienced, which positions, how international. */
export function rosterMakeup(players: Player[]): RosterMakeup {
  const aged = players.filter((p): p is Player & { age: number } => p.age != null);
  const tall = players.filter((p): p is Player & { heightCm: number } => p.heightCm != null);
  const positions: RosterMakeup['positions'] = { G: 0, F: 0, C: 0, other: 0 };
  for (const p of players) positions[positionGroup(p.position) ?? 'other'] += 1;
  const abroad = players.filter((p) => p.country && !/^(united states|usa|us)$/i.test(p.country.trim()));
  const exp = players.flatMap((p) => (p.experience != null ? [p.experience] : []));
  return {
    count: players.length,
    avgAge: average(aged.map((p) => p.age)),
    youngest: aged.reduce<Player | undefined>((best, p) => (best?.age != null && best.age <= p.age ? best : p), undefined),
    oldest: aged.reduce<Player | undefined>((best, p) => (best?.age != null && best.age >= p.age ? best : p), undefined),
    avgHeightCm: average(tall.map((p) => p.heightCm)),
    avgWeightKg: average(players.flatMap((p) => (p.weightKg != null ? [p.weightKg] : []))),
    tallest: tall.reduce<Player | undefined>((best, p) => (best?.heightCm != null && best.heightCm >= p.heightCm ? best : p), undefined),
    rookies: players.filter((p) => p.experience === 0).length,
    veterans: players.filter((p) => (p.experience ?? 0) >= 10).length,
    avgExperience: average(exp),
    positions,
    international: abroad.length,
    countries: new Set(abroad.map((p) => p.country!.trim().toLowerCase())).size,
  };
}

/** One finished game of the team: who started it and whether it won. */
export type StartedGame = { gameId: string; won: boolean; starterIds: string[] };

export type Lineup = { key: string; ids: string[]; games: number; wins: number };

/** Starting fives, most used first: the same five players (in any order) are one lineup; a game that did not list five starters is left out. */
export function lineupsFrom(games: StartedGame[]): Lineup[] {
  const byKey = new Map<string, Lineup>();
  for (const g of games) {
    const ids = [...new Set(g.starterIds)].sort();
    if (ids.length !== 5) continue;
    const key = ids.join('|');
    const found = byKey.get(key) ?? { key, ids, games: 0, wins: 0 };
    found.games += 1;
    if (g.won) found.wins += 1;
    byKey.set(key, found);
  }
  return [...byKey.values()].sort((a, b) => b.games - a.games || b.wins - a.wins || a.key.localeCompare(b.key));
}

/** Games started by each player over the games given. */
export function startsByPlayer(games: StartedGame[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of games) for (const id of new Set(g.starterIds)) out[id] = (out[id] ?? 0) + 1;
  return out;
}

/** The rows of the two-player comparison: which side is ahead on each (none for age and experience: older is not better). */
export const COMPARE_KEYS: { key: RosterCategoryKey; label: string; better: 'higher' | 'none' }[] = [
  { key: 'ppg', label: 'Points', better: 'higher' },
  { key: 'rpg', label: 'Rebounds', better: 'higher' },
  { key: 'apg', label: 'Assists', better: 'higher' },
  { key: 'spg', label: 'Steals', better: 'higher' },
  { key: 'bpg', label: 'Blocks', better: 'higher' },
  { key: 'mpg', label: 'Minutes', better: 'higher' },
  { key: 'fgPct', label: 'FG%', better: 'higher' },
  { key: 'threePct', label: '3P%', better: 'higher' },
  { key: 'ftPct', label: 'FT%', better: 'higher' },
  { key: 'age', label: 'Age', better: 'none' },
  { key: 'experience', label: 'Experience', better: 'none' },
  { key: 'height', label: 'Height', better: 'none' },
  { key: 'weight', label: 'Weight', better: 'none' },
];

export type CompareRow = { key: RosterCategoryKey; label: string; a?: number; b?: number; leader: 'a' | 'b' | null };

/** Two teammates side by side: each row's numbers and who leads it (null when level, when a number is missing, or when higher is not better). */
export function compareTeammates(
  a: { player: Player; stats?: PlayerSeasonStats },
  b: { player: Player; stats?: PlayerSeasonStats },
): CompareRow[] {
  return COMPARE_KEYS.map(({ key, label, better }) => {
    const av = categoryValue(a.player, a.stats, key);
    const bv = categoryValue(b.player, b.stats, key);
    let leader: CompareRow['leader'] = null;
    if (better === 'higher' && av != null && bv != null && av !== bv) leader = av > bv ? 'a' : 'b';
    return { key, label, a: av, b: bv, leader };
  });
}
