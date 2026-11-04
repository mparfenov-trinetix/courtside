import type { Game, GameLogEntry } from '../espn';

export type CatchUpItem =
  | { kind: 'result'; id: string; result: 'W' | 'L'; text: string; gameId: string }
  | { kind: 'standing'; id: string; from: number; to: number }
  | { kind: 'player'; id: string; playerId: string; teamId: string; name: string; line: string; context: string; gameId: string };

/** Away for less than this and there is nothing worth a card. */
export const MIN_AWAY_MS = 3 * 60 * 60 * 1000;

const after = (iso: string, since: number) => Date.parse(iso) > since;

/**
 * What happened while the app was closed: your team's finished games, whether it moved in the standings, and how the
 * players you watch did. Pure, so it can be tested without the network. Empty when you were only gone a moment.
 */
export function buildCatchUp(opts: {
  since: number;
  now?: number;
  schedule?: Game[];
  seedBefore?: number;
  seedNow?: number;
  watched?: { id: string; name: string; teamId: string; log?: GameLogEntry[] }[];
}): CatchUpItem[] {
  const now = opts.now ?? Date.now();
  if (now - opts.since < MIN_AWAY_MS) return [];
  const items: CatchUpItem[] = [];

  const played = (opts.schedule ?? [])
    .filter((g) => g.completed && g.result && g.teamScore != null && g.opponentScore != null && after(g.date, opts.since))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  for (const g of played) {
    items.push({
      kind: 'result',
      id: `r${g.id}`,
      gameId: g.id,
      result: g.result as 'W' | 'L',
      text: `${g.result} ${g.teamScore}–${g.opponentScore} ${g.home ? 'vs' : '@'} ${g.opponentAbbr}`,
    });
  }

  if (opts.seedBefore != null && opts.seedNow != null && opts.seedBefore !== opts.seedNow) {
    items.push({ kind: 'standing', id: 'standing', from: opts.seedBefore, to: opts.seedNow });
  }

  for (const p of opts.watched ?? []) {
    const last = (p.log ?? []).find((g) => after(g.date, opts.since));
    if (!last) continue;
    items.push({
      kind: 'player',
      id: `p${p.id}`,
      playerId: p.id,
      teamId: p.teamId,
      name: p.name,
      gameId: last.gameId,
      line: `${last.pts} pts · ${last.reb} reb · ${last.ast} ast`,
      context: `${last.result ?? ''} ${last.home ? 'vs' : '@'} ${last.opponent}`.trim(),
    });
  }
  return items;
}
