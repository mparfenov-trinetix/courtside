import { CORE, fetchRef, getJson, type Json } from './client';
import { currentSeason } from './common';
import { headshotUrl } from './legend-photos';

/**
 * ESPN's futures feed: a sportsbook's (DraftKings') odds for the season's big questions, who wins the title, each conference, the
 * MVP and the other awards. Odds are American moneylines ("+295"). There is one book, so a "chance" is that line turned into an implied
 * probability and scaled so a market's chances add up to 100% (the book's margin removed).
 */

export type MarketKey = 'title' | 'east' | 'west' | 'mvp' | 'roy' | 'dpoy' | 'mip' | 'sixth' | 'coach' | 'clutch';

export type FuturesEntry = {
  /** The team's ESPN id, or the athlete's (a player's NBA id; a coach's is a coach id, not a player page). */
  id: string;
  kind: 'team' | 'athlete';
  /** American odds as written ("+295", "-150") and as a number. */
  line: string;
  odds: number;
  /** The book's implied probability, scaled so the market adds up to 1. */
  chance: number;
  /** Athletes only (a team is named by the app's team list): name, photo and the team he is with. */
  name?: string;
  headshot?: string;
  teamId?: string;
};

export type FuturesMarket = { key: MarketKey; name: string; entries: FuturesEntry[] };

/** The markets the app shows, by the words in ESPN's name for them. */
const MARKETS: { key: MarketKey; test: RegExp; label: string }[] = [
  { key: 'title', test: /^NBA - Winner$/i, label: 'NBA title' },
  { key: 'east', test: /Eastern Conference - Winner/i, label: 'Eastern Conference' },
  { key: 'west', test: /Western Conference - Winner/i, label: 'Western Conference' },
  { key: 'mvp', test: /Regular Season MVP/i, label: 'MVP' },
  { key: 'roy', test: /Rookie of the Year/i, label: 'Rookie of the Year' },
  { key: 'dpoy', test: /Defensive Player of the Year/i, label: 'Defensive Player of the Year' },
  { key: 'mip', test: /Most Improved/i, label: 'Most Improved Player' },
  { key: 'sixth', test: /6th Man/i, label: 'Sixth Man of the Year' },
  { key: 'coach', test: /Coach of the Year/i, label: 'Coach of the Year' },
  { key: 'clutch', test: /Clutch Player/i, label: 'Clutch Player of the Year' },
];

export const marketLabel = (key: MarketKey): string => MARKETS.find((m) => m.key === key)?.label ?? key;

/** "+295" -> 295, "-150" -> -150, anything else -> undefined. */
export function parseMoneyline(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value.replace('+', '').trim()) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) && n !== 0 ? n : undefined;
}

/** The probability a moneyline implies, margin included: +300 -> 25%, -200 -> 66.7%. */
export const impliedChance = (ml: number): number => (ml > 0 ? 100 / (ml + 100) : -ml / (-ml + 100));

const idIn = (ref: unknown, collection: string): string | undefined =>
  typeof ref === 'string' ? new RegExp(`/${collection}/(\\d+)`).exec(ref)?.[1] : undefined;

/** How many of each award's candidates get their name and photo looked up (one request each); the rest are past the favorites. */
const ATHLETES_SHOWN = 6;

/**
 * Pure: the markets from the `futures` response. Entries are best odds first (the favorite), chances scaled to the market. An athlete's
 * name and photo come from `athletes` (by id), which the fetch fills for the favorites only.
 */
export function normalizeFutures(json: Json, athletes: Record<string, Json> = {}): FuturesMarket[] {
  const out: FuturesMarket[] = [];
  for (const market of MARKETS) {
    const item = ((json.items ?? []) as Json[]).find((i) => market.test.test(String(i.name ?? '').replace(/‎/g, '')));
    const books = (item?.futures?.[0]?.books ?? []) as Json[];
    const rows = books.flatMap((b) => {
      const odds = parseMoneyline(b.value);
      const isTeam = !!b.team;
      const id = idIn(isTeam ? b.team?.$ref : b.athlete?.$ref, isTeam ? 'teams' : 'athletes');
      return odds && id ? [{ id, isTeam, odds, line: String(b.value) }] : [];
    });
    if (rows.length === 0) continue;
    const total = rows.reduce((sum, r) => sum + impliedChance(r.odds), 0);
    const entries = rows
      .map((r): FuturesEntry => {
        const a = r.isTeam ? undefined : athletes[r.id];
        const teamId = a ? idIn(a.team?.$ref, 'teams') : undefined;
        return {
          id: r.id,
          kind: r.isTeam ? 'team' : 'athlete',
          line: r.line,
          odds: r.odds,
          chance: impliedChance(r.odds) / total,
          name: a?.displayName ? String(a.displayName) : undefined,
          // A coach has no photo (his id is not a player's, so ESPN's headshot file would be a 404).
          headshot: a && market.key !== 'coach' ? (a.headshot?.href ? String(a.headshot.href) : headshotUrl(r.id)) : undefined,
          teamId,
        };
      })
      .sort((a, b) => b.chance - a.chance);
    out.push({ key: market.key, name: market.label, entries });
  }
  return out;
}

/**
 * The season's futures: one call, then (with `withAthletes`) the favorites' records in the award markets, their names, photos and teams: about
 * forty requests, so the team page, which only wants the team markets, asks without.
 */
export async function fetchFutures(season: number = currentSeason(), withAthletes = true): Promise<FuturesMarket[]> {
  const json = await getJson(`${CORE}/seasons/${season}/futures?lang=en&region=us`);
  const first = normalizeFutures(json);
  if (!withAthletes) return first;
  const refs = new Map<string, string>();
  for (const market of first) {
    for (const e of market.entries.slice(0, ATHLETES_SHOWN)) {
      if (e.kind === 'athlete') refs.set(e.id, `${CORE}/seasons/${season}/athletes/${e.id}?lang=en&region=us`);
    }
  }
  const athletes: Record<string, Json> = {};
  await Promise.all([...refs].map(async ([id, ref]) => {
    const record = await fetchRef(ref);
    if (record) athletes[id] = record;
  }));
  return normalizeFutures(json, athletes);
}
