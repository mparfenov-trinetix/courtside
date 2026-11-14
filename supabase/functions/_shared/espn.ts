// ESPN's scoreboard, read for the settle function. Pure (fetch is passed in), so Node tests can run it. The endpoint and the field names are the
// app's own (src/lib/espn/scoreboard.ts); classifyGame and cupStage are copies of src/lib/espn/common.ts, held to it by supabase/tests/espn.test.ts.

import { classifyStatus, type GameStatus } from './scoring.ts';

export const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

type Json = Record<string, any>;

export type GameKind = 'regular' | 'preseason' | 'allstar' | 'playoffs' | 'playin' | 'cup-group' | 'cup-knockout';

/** "NBA Cup - Group Play" -> "Group Play"; undefined for any game that is not Cup. Copy of cupStage in src/lib/espn/common.ts. */
export function cupStage(note: unknown): string | undefined {
  const m = /NBA (?:Cup|In-Season Tournament)\s*[-–:]?\s*(.*)$/i.exec(typeof note === 'string' ? note : '');
  return m ? m[1]!.trim() || 'NBA Cup' : undefined;
}

/** Copy of classifyGame in src/lib/espn/common.ts: from ESPN's game note and season type (1 preseason, 2 regular, 3 playoffs, 5 play-in). */
export function classifyGame(note: unknown, seasonType: unknown): GameKind {
  const text = typeof note === 'string' ? note : '';
  if (/all-star|rising stars|celebrity game|skills challenge|slam dunk|three-point contest/i.test(text)) return 'allstar';
  const cup = cupStage(text);
  if (cup !== undefined) return /group/i.test(cup) ? 'cup-group' : 'cup-knockout';
  const type = Number(seasonType);
  if (type === 3) return 'playoffs';
  if (type === 5) return 'playin';
  if (type === 1) return 'preseason';
  return 'regular';
}

export type GameRow = {
  id: string;
  /** ISO 8601, with seconds and a Z. */
  tipOff: string;
  awayId: string;
  awayAbbr: string;
  homeId: string;
  homeAbbr: string;
  status: GameStatus;
  statusDetail: string;
  awayScore: number | null;
  homeScore: number | null;
  /** ESPN's own winner flag. */
  winnerId?: string;
  kind: GameKind;
};

/** ESPN writes "2026-11-14T00:00Z" (no seconds): fill them in so every parser reads it. Null when the date cannot be read. */
export function parseTipOff(date: unknown): string | null {
  if (typeof date !== 'string') return null;
  const ms = new Date(date.replace(/T(\d\d:\d\d)Z$/, 'T$1:00Z')).getTime();
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

const scoreOf = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

/** A scoreboard response as game rows. Events it cannot make sense of (no id, no two teams, no readable date) are skipped, not guessed at. */
export function normalizeScoreboard(json: Json): GameRow[] {
  const rows: GameRow[] = [];
  for (const ev of (json?.events ?? []) as Json[]) {
    const comp: Json = ev.competitions?.[0] ?? {};
    const type: Json = comp.status?.type ?? {};
    const competitors: Json[] = comp.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');
    const tipOff = parseTipOff(ev.date);
    if (!ev.id || !home || !away || !tipOff || !home.team?.id || !away.team?.id) continue;
    const winner = [home, away].find((c) => c.winner === true);
    const note = comp.notes?.[0]?.headline;
    rows.push({
      id: String(ev.id),
      tipOff,
      awayId: String(away.team.id),
      awayAbbr: String(away.team.abbreviation ?? ''),
      homeId: String(home.team.id),
      homeAbbr: String(home.team.abbreviation ?? ''),
      status: classifyStatus(type.name, type.state, type.completed),
      statusDetail: String(type.shortDetail ?? type.description ?? ''),
      awayScore: scoreOf(away.score),
      homeScore: scoreOf(home.score),
      winnerId: winner ? String(winner.team.id) : undefined,
      kind: classifyGame(note, ev.season?.type),
    });
  }
  return rows;
}

/** An Eastern calendar day as ESPN keys it (YYYYMMDD). */
export function easternDateKey(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}${get('month')}${get('day')}`;
}

/** How many Eastern days before and after today the settle function reads: yesterday for the games that ended after midnight, and two ahead
 *  so a phone anywhere in the world finds "tomorrow" (a game that starts tomorrow evening in Asia is still two Eastern days ahead). */
export const DAYS_BEHIND = 1;
export const DAYS_AHEAD = 2;

/** The scoreboard keys to read now: Eastern today, minus DAYS_BEHIND to plus DAYS_AHEAD (built on calendar days, so DST changes do not skip or repeat one). */
export function scoreboardDateKeys(now: Date = new Date(), behind = DAYS_BEHIND, ahead = DAYS_AHEAD): string[] {
  const today = easternDateKey(now);
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(4, 6));
  const d = Number(today.slice(6, 8));
  const keys: string[] = [];
  for (let offset = -behind; offset <= ahead; offset++) {
    const day = new Date(Date.UTC(y, m - 1, d + offset));
    keys.push(`${day.getUTCFullYear()}${String(day.getUTCMonth() + 1).padStart(2, '0')}${String(day.getUTCDate()).padStart(2, '0')}`);
  }
  return keys;
}

/** Reads one scoreboard day. `fetcher` is `fetch` (or a stub in tests); a failed day throws, the caller decides what to do about it. */
export async function fetchScoreboardDay(key: string, fetcher: typeof fetch = fetch, timeoutMs = 15_000): Promise<GameRow[]> {
  const res = await fetcher(`${ESPN_BASE}/scoreboard?dates=${key}&limit=20`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`ESPN answered ${res.status} for ${key}`);
  return normalizeScoreboard(await res.json());
}
