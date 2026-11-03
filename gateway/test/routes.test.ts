import assert from 'node:assert/strict';
import { test } from 'node:test';

import { easternDateKey, resolve } from '../src/routes.ts';

const NOW = new Date('2026-11-03T12:00:00Z'); // 07:00 in New York: Eastern date 20261103

test('maps a gateway path onto the right ESPN host and keeps the query', () => {
  const r = resolve('/espn/site/scoreboard', '?dates=20261103&limit=20', NOW)!;
  assert.equal(r.upstream, 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261103&limit=20');
  assert.equal(resolve('/espn/web2/standings', '?type=0&level=3', NOW)!.upstream.startsWith('https://site.web.api.espn.com/apis/v2/'), true);
  assert.equal(resolve('/espn/web3/athletes/4066648/stats', '', NOW)!.upstream, 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/4066648/stats');
  assert.equal(resolve('/espn/search/', '?query=jokic', NOW)!.upstream, 'https://site.web.api.espn.com/apis/common/v3/search?query=jokic');
  // The app sends it without the trailing slash.
  assert.equal(resolve('/espn/search', '?query=jokic', NOW)!.upstream, 'https://site.web.api.espn.com/apis/common/v3/search?query=jokic');
});

test('is not an open proxy', () => {
  assert.equal(resolve('/espn/site/../../etc/passwd', '', NOW), null);
  assert.equal(resolve('/espn/site/anything-else', '', NOW), null);
  assert.equal(resolve('/espn/evil/scoreboard', '', NOW), null);
  assert.equal(resolve('/other', '', NOW), null);
  assert.equal(resolve('/espn/web3/athletes/abc/stats', '', NOW), null);
});

test('scoreboard: live today is cached for seconds, past days for hours', () => {
  assert.equal(resolve('/espn/site/scoreboard', '?dates=20261103', NOW)!.ttl({}), 15);
  assert.equal(resolve('/espn/site/scoreboard', '?dates=20261101', NOW)!.ttl({}), 6 * 3600);
});

test('summary: a finished game is cached for a day, a live one for seconds', () => {
  const body = (state: string) => ({ header: { competitions: [{ status: { type: { state } } }] } });
  const r = resolve('/espn/site/summary', '?event=401909912', NOW)!;
  assert.equal(r.ttl(body('post')), 24 * 3600);
  assert.equal(r.ttl(body('in')), 10);
  assert.equal(r.ttl(body('pre')), 10);
  assert.equal(r.ttl({}), 10);
});

test('slow-moving data gets longer lifetimes', () => {
  assert.equal(resolve('/espn/site/teams', '', NOW)!.ttl({}), 24 * 3600);
  assert.equal(resolve('/espn/site/teams/20/roster', '', NOW)!.ttl({}), 6 * 3600);
  assert.equal(resolve('/espn/site/teams/20/schedule', '', NOW)!.ttl({}), 600);
  assert.equal(resolve('/espn/web2/standings', '', NOW)!.ttl({}), 300);
});

test('Eastern date key follows New York, not UTC', () => {
  assert.equal(easternDateKey(new Date('2026-11-03T03:00:00Z')), '20261102'); // still the 2nd in New York
  assert.equal(easternDateKey(new Date('2026-11-03T12:00:00Z')), '20261103');
});
