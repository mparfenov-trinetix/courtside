import { BASE, getJson, type Json } from './client';
import { headshotUrl } from './legend-photos';

/**
 * The league's wire: who is hurt and what the teams have done (signings, waivers, trades). Both are ESPN's site feeds, league-wide:
 * `injuries` lists every team's report (about ninety players in season) and `transactions` is the season's moves, newest first.
 */

export type InjuryStatus = 'Out' | 'Day-To-Day' | string;

export type InjuredPlayer = {
  id: string;
  name: string;
  position?: string;
  headshot?: string;
  status: InjuryStatus;
  /** "Left knee · Inflammation": what and where, when ESPN says. */
  detail?: string;
  /** ISO day he is expected back, when ESPN gives one. */
  returnDate?: string;
  /** ESPN's one-line note ("Gilbert (knee) is out for Saturday's game against Brooklyn."). */
  note?: string;
  updated: string;
};

export type TeamInjuries = { teamId: string; teamName: string; injuries: InjuredPlayer[] };

/** Pure: the injury report by team, teams with no one hurt left out, the longest-standing news last within a team (newest first). */
export function normalizeInjuries(json: Json): TeamInjuries[] {
  return ((json.injuries ?? []) as Json[])
    .map((t): TeamInjuries => ({
      teamId: String(t.id ?? ''),
      teamName: String(t.displayName ?? ''),
      injuries: ((t.injuries ?? []) as Json[]).flatMap((i): InjuredPlayer[] => {
        const a = (i.athlete ?? {}) as Json;
        const link = ((a.links ?? []) as Json[]).find((l) => (l.rel ?? []).includes('playercard'))?.href;
        const id = typeof link === 'string' ? /\/id\/(\d+)/.exec(link)?.[1] : undefined;
        if (!id || !a.displayName) return [];
        const d = (i.details ?? {}) as Json;
        const where = [d.side, d.type].filter(Boolean).join(' ').toLowerCase();
        const detail = [where ? where.charAt(0).toUpperCase() + where.slice(1) : undefined, d.detail].filter(Boolean).join(' · ');
        return [
          {
            id,
            name: String(a.displayName),
            position: a.position?.abbreviation ? String(a.position.abbreviation) : undefined,
            headshot: a.headshot?.href ? String(a.headshot.href) : headshotUrl(id),
            status: String(i.status ?? ''),
            detail: detail || undefined,
            returnDate: typeof d.returnDate === 'string' && d.returnDate ? d.returnDate : undefined,
            note: i.shortComment ? String(i.shortComment) : undefined,
            updated: String(i.date ?? ''),
          },
        ];
      }).sort((x, y) => y.updated.localeCompare(x.updated)),
    }))
    .filter((t) => t.injuries.length > 0)
    .sort((a, b) => a.teamName.localeCompare(b.teamName));
}

export async function fetchInjuries(): Promise<TeamInjuries[]> {
  return normalizeInjuries(await getJson(`${BASE}/injuries`));
}

export type Transaction = { id: string; date: string; text: string; teamId: string; teamName: string };

/** Pure: the moves of a page of the transactions feed, with the total the season has. */
export function normalizeTransactions(json: Json): { total: number; items: Transaction[] } {
  const items = ((json.transactions ?? []) as Json[]).flatMap((t, i): Transaction[] => {
    const text = typeof t.description === 'string' ? t.description.trim() : '';
    if (!text) return [];
    return [{ id: `${t.date}-${t.team?.id}-${i}`, date: String(t.date ?? ''), text, teamId: String(t.team?.id ?? ''), teamName: String(t.team?.displayName ?? '') }];
  });
  return { total: Number(json.count ?? items.length), items };
}

/** The newest `limit` moves of the season. */
export async function fetchTransactions(limit: number): Promise<{ total: number; items: Transaction[] }> {
  return normalizeTransactions(await getJson(`${BASE}/transactions?limit=${limit}`));
}
