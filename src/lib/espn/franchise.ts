import { FRANCHISE_ERAS } from './franchise-eras';
import type { Team } from './teams';

/**
 * A team's identity over the years: ESPN keeps one team id per franchise and, for each season, the name, tri-code and logo the team had
 * then (`franchise-eras.ts`, generated from the core API's season-scoped records by `scripts/build-franchise-eras.ts`). The Sonics and the
 * Thunder are one id (25), as are the Nets and the Nets (17). A season is the year it ends in: 2009 is 2008-09.
 */
export type TeamEra = {
  /** The first season of this identity as ESPN lists it (the earliest one is where ESPN's records begin, not where the team did). */
  from: number;
  /** The last season of it; null for the identity the team has now. */
  to: number | null;
  name: string;
  location: string;
  nickname: string;
  /** The tri-code the team went by then (NJN, NOH, WSB: the ones ESPN's feeds shorten or lack). */
  abbr: string;
  /** The identity the team has today. */
  current: boolean;
};

/** The codes ESPN lacks for the seasons before 1985, keyed by team id and the name of the era (the NBA's own). Everywhere else the tri-code is ESPN's, the one its feeds print. */
const ABBR: Record<string, string> = {
  '12|San Diego Clippers': 'SDC',
  '23|Kansas City Kings': 'KCK',
};

const cache = new Map<string, TeamEra[]>();

/** Every identity a team has had, oldest first; one entry for a team that never changed. Empty for an id ESPN has no record of. */
export function teamEras(teamId: string): TeamEra[] {
  const known = cache.get(teamId);
  if (known) return known;
  const entry = FRANCHISE_ERAS[teamId];
  const eras: TeamEra[] = (entry?.eras ?? []).map((e, i, all) => ({
    from: e.from,
    to: i === all.length - 1 ? null : all[i + 1].from - 1,
    name: e.name,
    location: e.location,
    nickname: e.nickname,
    abbr: ABBR[`${teamId}|${e.name}`] ?? e.abbr,
    current: i === all.length - 1,
  }));
  cache.set(teamId, eras);
  return eras;
}

/**
 * Old logos the app carries itself (ESPN has none: the logo it files under a retired name is today's), keyed by team id and the name of the
 * era (`25|Seattle SuperSonics`) and registered once at start-up by `installEraLogos` in `@/components`, because an image file can only be
 * required by the app, not by the Node tests that load this module. Without a registration an era keeps today's logo.
 */
const eraLogos = new Map<string, string>();

export function registerEraLogos(logos: Record<string, string>) {
  for (const [key, uri] of Object.entries(logos)) eraLogos.set(key, uri);
  // Anything dressed before the logos arrived is dressed again.
  dressed = new WeakMap();
}

/** The logo the team wore in that season, when it went by another name then and the app has the picture; otherwise nothing (use the feed's or today's). */
export function eraLogoFor(teamId: string, season?: number): string | undefined {
  if (season == null || Number.isNaN(season)) return undefined;
  const era = eraIn(teamId, season);
  return era && !era.current ? eraLogos.get(`${teamId}|${era.name}`) : undefined;
}

/** A team from a feed that already says the name of its time, with the logo of its time where the app has one (the feed's is today's emblem). The same object when it has none. */
export function withEraLogo<T extends { id: string; logo: string; logoDark: string; logoOnPrimary?: string }>(team: T, season?: number): T {
  const logo = eraLogoFor(team.id, season);
  return logo ? { ...team, logo, logoDark: logo, logoOnPrimary: logo } : team;
}

/** The identity the team had in a season (the earliest one for a season before ESPN's records begin). */
export function eraIn(teamId: string, season: number): TeamEra | undefined {
  const eras = teamEras(teamId);
  let found = eras[0];
  for (const era of eras) if (era.from <= season) found = era;
  return found;
}

/** Did the team go by another name (or live in another city) than today's in that season? */
export function renamedSince(teamId: string, season: number): boolean {
  const era = eraIn(teamId, season);
  return !!era && !era.current;
}

type EraTeam = Pick<Team, 'id' | 'abbreviation' | 'location' | 'name' | 'displayName' | 'logo' | 'logoDark'> & { logoOnPrimary?: string; mark?: string };
let dressed = new WeakMap<object, Map<number, unknown>>();

/**
 * The team as it was in a season: the same team with the name, location and tri-code of that time (the SuperSonics for Oklahoma City in 2007,
 * the New Jersey Nets for Brooklyn in 2010) and, where the app carries it (`registerEraLogos`), the logo of that time. ESPN has no older logo
 * designs (the logo it files under a retired name is today's emblem of the franchise), so an era without a registered picture keeps today's
 * logos. The colors stay today's, so the theme does not change with the year. The team itself, untouched and the very same object, when it
 * was called what it is called now, so nothing that compares or memoizes on it notices.
 */
export function teamInSeason<T extends EraTeam>(team: T, season?: number): T;
export function teamInSeason<T extends EraTeam>(team: T | undefined, season?: number): T | undefined;
export function teamInSeason<T extends EraTeam>(team: T | undefined, season?: number): T | undefined {
  if (!team || season == null) return team;
  const era = eraIn(team.id, season);
  if (!era || era.current) return team;
  let byEra = dressed.get(team);
  if (!byEra) dressed.set(team, (byEra = new Map()));
  let out = byEra.get(era.from) as T | undefined;
  if (!out) {
    const logo = eraLogoFor(team.id, season);
    out = {
      ...team,
      abbreviation: era.abbr || team.abbreviation,
      location: era.location || team.location,
      name: era.nickname || team.name,
      displayName: era.name,
      // The secondary mark is today's emblem; the old logo stands in everywhere.
      ...(logo ? { logo, logoDark: logo, logoOnPrimary: logo, mark: undefined } : null),
    };
    byEra.set(era.from, out);
  }
  return out;
}

/**
 * The colors of the names the app has a card for (taken from their logos): `[primary, secondary]`,
 * keyed like the logos by team id and era name. A past season of a name in this table opens its team card in those colors
 * (`TeamSeasonHome`); a name without one (the Bullets, the Vancouver Grizzlies) opens it in today's colors.
 */
const ERA_COLORS: Record<string, [string, string]> = {
  '25|Seattle SuperSonics': ['#00653A', '#FFC200'],
  // The Nets' shield is navy and the Bobcats' panel and the Hornets' lettering are blue and teal: on a card of that color the logo would
  // dissolve, so the card takes the logo's other color (silver, a deeper navy, purple, a deeper blue) and the stripe the one it is known by.
  '17|New Jersey Nets': ['#6E7780', '#CE1141'],
  '30|Charlotte Bobcats': ['#14284F', '#E05206'],
  '3|Charlotte Hornets': ['#281A66', '#00A3B5'],
  '3|New Orleans Hornets': ['#0B2F4E', '#F9BA00'],
  '3|New Orleans/Oklahoma City Hornets': ['#0B2F4E', '#F9BA00'],
};

/** The era's own colors, when the team went by another name then and the app has a card for that name. */
export function eraColorsFor(teamId: string, season?: number): { color: string; alternateColor: string } | undefined {
  if (season == null || Number.isNaN(season)) return undefined;
  const era = eraIn(teamId, season);
  const pair = era && !era.current ? ERA_COLORS[`${teamId}|${era.name}`] : undefined;
  return pair ? { color: pair[0], alternateColor: pair[1] } : undefined;
}

const lookedBack = new WeakMap<object, Map<number, unknown>>();

/**
 * `teamInSeason` with the era's colors too: the team as its card should look in that season, name, code, logo and colors. Only for a name with
 * an entry in the colors table; anything else comes back as `teamInSeason` gives it (the colors stay today's).
 */
export function teamAsItWas<T extends EraTeam & { color: string; alternateColor: string }>(team: T, season?: number): T {
  const colors = eraColorsFor(team.id, season);
  const dressedTeam = teamInSeason(team, season);
  if (!colors) return dressedTeam;
  let byDressed = lookedBack.get(dressedTeam);
  if (!byDressed) lookedBack.set(dressedTeam, (byDressed = new Map()));
  const key = eraIn(team.id, season ?? 0)?.from ?? 0;
  let out = byDressed.get(key) as T | undefined;
  if (!out) {
    out = { ...dressedTeam, ...colors };
    byDressed.set(key, out);
  }
  return out;
}
