import type { Json } from './client';

export function hex(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !/^[0-9a-fA-F]{6}$/.test(value)) return fallback;
  return `#${value.toUpperCase()}`;
}

/**
 * "NBA Cup - Group Play" -> "Group Play"; undefined for any game that isn't Cup. The first edition (2023-24) was called the
 * In-Season Tournament, and its final's note has no dash ("NBA In-Season Tournament Championship").
 */
export function cupStage(note: unknown): string | undefined {
  const m = /NBA (?:Cup|In-Season Tournament)\s*[-–:]?\s*(.*)$/i.exec(typeof note === 'string' ? note : '');
  return m ? m[1].trim() || 'NBA Cup' : undefined;
}

/**
 * What kind of game this is, from ESPN's game note ("West Finals - Game 2", "NBA Cup - Group Play", "NBA All-Star - Round Robin") and
 * season type (1 preseason, 2 regular, 3 playoffs, 5 play-in). It decides where a game page links to: the regular-season standings,
 * the playoff bracket, the Cup, or nowhere (an All-Star or preseason game is in no table). A Cup game from group play is also a
 * regular-season game, but the Cup is where it matters; the Cup final is in no standings at all.
 */
export type GameKind = 'regular' | 'preseason' | 'allstar' | 'playoffs' | 'playin' | 'cup-group' | 'cup-knockout';

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

/**
 * ESPN's playoff series summary in a few words: "SA leads series 3-2" -> "SA leads 3-2", "NYK wins series 4-2" -> "NYK won 4-2",
 * "Series tied 3-3" -> "Tied 3-3". For a finished game ESPN's text is the series as it stood after that game, for one still to be
 * played as it stands now. Undefined when there is none.
 */
export function seriesLine(summary: unknown): string | undefined {
  const text = typeof summary === 'string' ? summary.trim() : '';
  if (!text) return undefined;
  return text.replace(/^Series tied\b/i, 'Tied').replace(/\blea(?:ds|d) series\b/i, 'leads').replace(/\bwins series\b/i, 'won');
}

export function parseScore(score: unknown): number | undefined {
  if (score == null) return undefined;
  if (typeof score === 'object' && score !== null && 'value' in score) return (score as Json).value;
  const n = Number(score);
  return isNaN(n) ? undefined : n;
}

/** The NBA season's ending year: 2027 is the 2026-27 season. */
export function currentSeason(): number {
  const now = new Date();
  return now.getFullYear() + (now.getMonth() >= 9 ? 1 : 0);
}

/**
 * ESPN's logo for a team in the feeds that only carry its default one. For the Celtics that is the shamrock roundel (their
 * secondary logo), so their real primary logo is swapped in; every other team's logo passes through untouched.
 */
const PRIMARY_LOGO_GUID: Record<string, string> = { BOS: '2ca761df-5f60-b2e9-22ed-e099c46d889b' };

export function teamLogo(abbr: string | undefined, href: string | undefined): string {
  const guid = abbr ? PRIMARY_LOGO_GUID[abbr] : undefined;
  if (guid) return `https://a.espncdn.com/combiner/i?img=/guid/${guid}/logos/primary_logo_on_black_color.png&w=500&h=500&transparent=true`;
  return href ?? '';
}

/** The season a game date belongs to: games from September on count toward the season that ends the next year. */
export function seasonOfDate(iso: string): number {
  const d = new Date(iso);
  return d.getFullYear() + (d.getMonth() >= 8 ? 1 : 0);
}

/** 2027 -> "2026-27". */
export const seasonLabel = (year: number) => `${year - 1}-${String(year).slice(2)}`;
