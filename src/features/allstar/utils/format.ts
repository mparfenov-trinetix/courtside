import type { AllStarGame, AllStarPlayer } from '@/lib/espn';

/** "Sun, Feb 16" in the device's day. */
export const dayLabel = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

/** "2024-25": the season an All-Star Game (played in February of its last year) belongs to. */
export const weekendSeasonLabel = (season: number) => `${season - 1}-${String(season).slice(2)}`;

/**
 * The players grouped by the side they played for, in the order the games name the sides (so East comes before West and the
 * teams of a mini tournament keep the order of the bracket), then any side the games do not name. A player keeps his order
 * (points, as the data comes).
 */
export function groupByTeam(players: AllStarPlayer[], games: AllStarGame[]): { team: string; players: AllStarPlayer[] }[] {
  const order: string[] = [];
  for (const g of games) for (const t of g.teams) if (!order.includes(t.name)) order.push(t.name);
  for (const p of players) if (!order.includes(p.teamName)) order.push(p.teamName);
  return order
    .map((team) => ({ team, players: players.filter((p) => p.teamName === team) }))
    .filter((g) => g.players.length > 0);
}
