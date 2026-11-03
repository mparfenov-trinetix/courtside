/**
 * Which ESPN URL a gateway request maps to, and how long its answer can be cached.
 * Pure functions with no imports, so they run (and are tested) under plain Node.
 *
 *   GET /espn/<source>/<path>?<query>   ->   <ESPN base for source>/<path>?<query>
 */

export const SOURCES = {
  site: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba',
  web2: 'https://site.web.api.espn.com/apis/v2/sports/basketball/nba',
  web3: 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba',
  core: 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba',
  search: 'https://site.web.api.espn.com/apis/common/v3/search',
} as const;

export type Source = keyof typeof SOURCES;

/** What each source may be asked for. Anything else is a 404, so this is not an open proxy. */
const ALLOWED: Record<Source, RegExp[]> = {
  site: [/^scoreboard$/, /^summary$/, /^teams(\/\d+(\/(roster|schedule))?)?$/],
  web2: [/^standings$/],
  web3: [/^athletes\/\d+\/(stats|gamelog)$/, /^statistics\/byteam$/],
  core: [/^seasons\/\d+\/.+/],
  search: [/^$/],
};

export type Resolved = {
  upstream: string;
  /** Cache lifetime in seconds. Receives the parsed upstream body for routes that depend on it. */
  ttl: (body: unknown) => number;
};

const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Today's date in US Eastern as YYYYMMDD: ESPN's scoreboard days. */
export function easternDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}${get('month')}${get('day')}`;
}

export function resolve(pathname: string, search: string, now: Date = new Date()): Resolved | null {
  const match = /^\/espn\/([a-z0-9]+)\/?(.*)$/.exec(pathname);
  if (!match) return null;
  const source = match[1] as Source;
  const path = match[2].replace(/\/+$/, '');
  if (!(source in SOURCES) || path.includes('..')) return null;
  if (!ALLOWED[source].some((re) => re.test(path))) return null;

  const upstream = `${SOURCES[source]}${path ? `/${path}` : ''}${search}`;
  const params = new URLSearchParams(search);

  let ttl: Resolved['ttl'] = () => 30 * MIN;

  if (source === 'site') {
    if (path === 'scoreboard') {
      // Past days never change again; today's board is what's live.
      const day = (params.get('dates') ?? '').slice(0, 8);
      ttl = () => (day && day < easternDateKey(now) ? 6 * HOUR : 15);
    } else if (path === 'summary') {
      // A finished game is final. Anything else (live, or about to start) is polled by the app every ~15s.
      ttl = (body) => (statusState(body) === 'post' ? DAY : 10);
    } else if (/^teams$/.test(path)) ttl = () => DAY;
    else if (/\/roster$/.test(path)) ttl = () => 6 * HOUR;
    else if (/\/schedule$/.test(path)) ttl = () => 10 * MIN;
    else ttl = () => HOUR;
  } else if (source === 'web2') ttl = () => 5 * MIN;
  else if (source === 'web3') ttl = () => (path.endsWith('/gamelog') ? 10 * MIN : path.endsWith('/stats') ? HOUR : 30 * MIN);
  else if (source === 'search') ttl = () => HOUR;

  return { upstream, ttl };
}

function statusState(body: unknown): string | undefined {
  const comp = (body as { header?: { competitions?: { status?: { type?: { state?: string } } }[] } })?.header?.competitions?.[0];
  return comp?.status?.type?.state;
}
