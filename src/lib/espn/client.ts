/**
 * ESPN's public (undocumented) NBA endpoints. No API key needed.
 * The response shapes are not guaranteed, so everything is normalized
 * defensively into our own small types before it reaches the UI.
 */
export const BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

export type Json = Record<string, any>;

/**
 * ESPN can change a response shape without notice. Normalizers call `report` when a response parses
 * but looks wrong (no standings rows, no play-by-play for a finished game...). The app registers a
 * reporter that shows a banner; a null detail means the source is healthy again.
 */
type HealthReporter = (source: string, detail: string | null) => void;

export let report: HealthReporter = () => {};

export function setHealthReporter(fn: HealthReporter) {
  report = fn;
}

/**
 * Optional caching gateway (see gateway/). When EXPO_PUBLIC_ESPN_PROXY is set, calls to ESPN go through
 * it: `<proxy>/<source>/<path>` where the source stands in for the ESPN base URL. Unset = straight to ESPN.
 */
const PROXY_SOURCES: [prefix: string, source: string][] = [
  ['https://site.api.espn.com/apis/site/v2/sports/basketball/nba', 'site'],
  ['https://site.web.api.espn.com/apis/v2/sports/basketball/nba', 'web2'],
  ['https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba', 'web3'],
  ['https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba', 'core'],
  ['https://site.web.api.espn.com/apis/common/v3/search', 'search'],
  ['https://site.web.api.espn.com/apis/search/v2', 'search2'],
];

export function viaProxy(url: string, proxy: string | undefined): string {
  if (!proxy) return url;
  for (const [prefix, source] of PROXY_SOURCES) {
    if (url.startsWith(prefix)) return `${proxy.replace(/\/+$/, '')}/${source}${url.slice(prefix.length) || '/'}`;
  }
  return url;
}

export async function getJson(url: string): Promise<Json> {
  const res = await fetch(viaProxy(url, process.env.EXPO_PUBLIC_ESPN_PROXY));
  if (!res.ok) throw new Error(`ESPN returned ${res.status} for ${url}`);
  return res.json();
}

export const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';
