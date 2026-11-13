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

/** ESPN answered, with a status that is not a success. A 4xx will not change when asked again (a bad id, a season that does not exist). */
export class HttpError extends Error {
  status: number;
  // (No parameter property: Node's type stripping, which runs the tests, does not take that syntax.)
  constructor(status: number, url: string) {
    super(`ESPN returned ${status} for ${url}`);
    this.status = status;
  }
}

/** How long a request may take before it is given up on: a stalled connection otherwise leaves a skeleton on screen for as long as the system waits. */
const REQUEST_TIMEOUT_MS = 20_000;

export async function getJson(url: string): Promise<Json> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(viaProxy(url, process.env.EXPO_PUBLIC_ESPN_PROXY), { signal: controller.signal });
    if (!res.ok) throw new HttpError(res.status, url);
    return await res.json();
  } catch (error) {
    if (controller.signal.aborted) throw new Error('ESPN took too long to answer');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';

/** Follows one of the core API's `$ref` links (http in the data, https here); a missing or failing one is undefined, never a throw. */
export const fetchRef = async (ref: unknown): Promise<Json | undefined> => {
  if (typeof ref !== 'string') return undefined;
  try {
    return await getJson(ref.replace('http://', 'https://'));
  } catch {
    return undefined;
  }
};
