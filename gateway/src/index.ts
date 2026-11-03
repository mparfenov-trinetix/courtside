import { resolve } from './routes.ts';

/**
 * A thin, caching layer between the app and ESPN's undocumented endpoints.
 *
 *  - one fetch from ESPN serves every device (fewer hits, faster answers)
 *  - CORS headers, so the web preview works too
 *  - if ESPN errors, the last good answer is served instead
 *  - a single place to change when ESPN moves something
 */

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

const cache = () => (caches as unknown as { default: Cache }).default;

const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS, ...extra } });

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405);

    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, at: new Date().toISOString() }, 200);

    const route = resolve(url.pathname, url.search);
    if (!route) return json({ error: 'not found' }, 404);

    const key = new Request(route.upstream, { method: 'GET' });
    const hit = await cache().match(key);
    if (hit) return withHeaders(hit, { 'x-cache': 'HIT' });

    let upstream: Response;
    try {
      upstream = await fetch(route.upstream, { headers: { accept: 'application/json' } });
    } catch {
      return json({ error: 'upstream unreachable' }, 502);
    }
    if (!upstream.ok) return json({ error: `ESPN returned ${upstream.status}` }, upstream.status === 404 ? 404 : 502);

    const text = await upstream.text();
    let ttl = 30;
    try {
      ttl = route.ttl(JSON.parse(text));
    } catch {
      // Not JSON: keep the short default rather than caching something odd for long.
    }

    const response = new Response(text, {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, max-age=${ttl}`,
        ...CORS,
        'x-cache': 'MISS',
      },
    });
    ctx.waitUntil(cache().put(key, response.clone()));
    return response;
  },
};

function withHeaders(res: Response, extra: Record<string, string>) {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}
