import { BASE, getJson } from './client';
import type { Json } from './client';
import { hex } from './common';

export type Team = {
  id: string;
  abbreviation: string;
  location: string; // "Boston"
  name: string; // "Celtics"
  displayName: string; // "Boston Celtics"
  color: string; // "#007A33"
  alternateColor: string;
  logo: string; // logo for light backgrounds
  logoDark: string; // logo for dark backgrounds (falls back to logo)
  /** ESPN's own dark-background variant, for sitting on the team's primary color (see logoOn). */
  logoOnPrimary?: string;
  /** ESPN's secondary logo (a lettered wordmark for a few teams, an alternate emblem for the rest), for headers. */
  mark?: string;
};

export type TeamDetail = Team & {
  record?: string; // "48-34"
  homeRecord?: string;
  awayRecord?: string;
  standing?: string; // "2nd in Atlantic Division"
  venue?: string;
};

export type Player = {
  id: string;
  name: string;
  shortName: string;
  jersey?: string;
  position?: string; // "PG"
  positionName?: string; // "Point Guard"
  height?: string;
  weight?: string;
  /** Same measurements in metric, derived from ESPN's inches and pounds. */
  heightCm?: number;
  weightKg?: number;
  /** Date of birth as YYYY-MM-DD. */
  born?: string;
  age?: number;
  college?: string;
  experience?: number;
  headshot?: string;
};

export type Roster = {
  players: Player[];
  coach?: string;
};

function pickLogo(logos: Json[] | undefined, variant: 'default' | 'dark') {
  if (!Array.isArray(logos) || logos.length === 0) return '';
  const match = logos.find((l) => Array.isArray(l.rel) && l.rel.includes(variant));
  return (match ?? logos[0]).href ?? '';
}

/**
 * Teams whose ESPN "default" logo is really the secondary one. The Celtics' is the shamrock roundel; their primary logo (the
 * leprechaun) only comes with the brand variants, so it is taken from there.
 */
const PRIMARY_FROM_BRAND = new Set(['BOS']);

export function normalizeTeam(t: Json): Team {
  const brand = PRIMARY_FROM_BRAND.has(t.abbreviation);
  const logo =
    (brand && brandLogo(t.logos, 'primary_logo_on_white_color')) ||
    pickLogo(t.logos, 'default') ||
    (typeof t.logo === 'string' ? t.logo : '');
  return {
    id: String(t.id),
    abbreviation: t.abbreviation ?? '',
    location: t.location ?? '',
    name: t.name ?? t.nickname ?? t.shortDisplayName ?? '',
    displayName: t.displayName ?? `${t.location ?? ''} ${t.name ?? ''}`.trim(),
    color: hex(t.color, '#1D428A'),
    alternateColor: hex(t.alternateColor, '#C8102E'),
    logo,
    // ESPN's "dark" variant is a flat white mark for these teams, which loses the team's identity on the
    // app's dark background: show the colored logo there instead.
    logoDark: (brand && brandLogo(t.logos, 'primary_logo_on_black_color')) || (COLORED_ON_DARK.has(t.abbreviation) ? logo : pickLogo(t.logos, 'dark') || logo),
    logoOnPrimary: (brand && brandLogo(t.logos, 'primary_logo_on_primary_color')) || pickLogo(t.logos, 'dark') || logo,
    mark: markUrl(t.logos),
  };
}

/** One of ESPN's brand-kit logos (the 4096px originals), resized through its image service. */
function brandLogo(logos: Json[] | undefined, rel: string, size = 500): string | undefined {
  const href: string | undefined = (logos ?? []).find((l) => Array.isArray(l.rel) && l.rel.includes(rel))?.href;
  const guid = href?.split('/guid/')[1];
  return guid ? `https://a.espncdn.com/combiner/i?img=/guid/${guid}&w=${size}&h=${size}&transparent=true` : undefined;
}

function markUrl(logos: Json[] | undefined): string | undefined {
  return brandLogo(logos, 'secondary_logo_on_black_color', 400);
}

const COLORED_ON_DARK = new Set(['TOR']);

export async function fetchTeams(): Promise<Team[]> {
  const json = await getJson(`${BASE}/teams`);
  const raw: Json[] = json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return raw
    .map((entry) => normalizeTeam(entry.team ?? entry))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function fetchTeamDetail(teamId: string): Promise<TeamDetail> {
  const json = await getJson(`${BASE}/teams/${teamId}`);
  const t = json.team ?? {};
  const items: Json[] = t.record?.items ?? [];
  const byType = (type: string) => items.find((i) => i.type === type)?.summary;
  return {
    ...normalizeTeam(t),
    record: byType('total') ?? items[0]?.summary,
    homeRecord: byType('home'),
    awayRecord: byType('road') ?? byType('away'),
    standing: t.standingSummary,
    venue: t.franchise?.venue?.fullName,
  };
}

function normalizePlayer(a: Json): Player {
  return {
    id: String(a.id),
    name: a.displayName ?? a.fullName ?? 'Unknown player',
    shortName: a.shortName ?? a.displayName ?? '',
    jersey: a.jersey,
    position: a.position?.abbreviation,
    positionName: a.position?.displayName,
    height: a.displayHeight,
    weight: a.displayWeight,
    heightCm: typeof a.height === 'number' && a.height > 0 ? Math.round(a.height * 2.54) : undefined,
    weightKg: typeof a.weight === 'number' && a.weight > 0 ? Math.round(a.weight * 0.45359237) : undefined,
    born: typeof a.dateOfBirth === 'string' ? a.dateOfBirth.slice(0, 10) : undefined,
    age: typeof a.age === 'number' ? a.age : undefined,
    college: a.college?.name ?? a.college?.shortName,
    experience: a.experience?.years,
    headshot: a.headshot?.href,
  };
}

export async function fetchRoster(teamId: string): Promise<Roster> {
  const json = await getJson(`${BASE}/teams/${teamId}/roster`);
  const raw: Json[] = json.athletes ?? [];
  // NBA rosters are flat, other sports group athletes by position: handle both.
  const flat = raw.flatMap((entry) => (Array.isArray(entry.items) ? entry.items : [entry]));
  const players = flat
    .map(normalizePlayer)
    .sort((a, b) => Number(a.jersey ?? 999) - Number(b.jersey ?? 999));
  const coach = Array.isArray(json.coach) && json.coach[0]
    ? `${json.coach[0].firstName ?? ''} ${json.coach[0].lastName ?? ''}`.trim()
    : undefined;
  return { players, coach };
}
