import assert from 'node:assert/strict';
import { test } from 'node:test';

import { viaProxy } from '../src/lib/espn.ts';

const PROXY = 'https://gw.example.workers.dev/espn';

test('without a proxy, URLs are left alone', () => {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261103';
  assert.equal(viaProxy(url, undefined), url);
  assert.equal(viaProxy(url, ''), url);
});

test('each ESPN host maps onto its gateway source and keeps path and query', () => {
  assert.equal(
    viaProxy('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=1', PROXY),
    `${PROXY}/site/summary?event=1`,
  );
  assert.equal(
    viaProxy('https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings?type=0', `${PROXY}/`),
    `${PROXY}/web2/standings?type=0`,
  );
  assert.equal(
    viaProxy('https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/9/stats', PROXY),
    `${PROXY}/web3/athletes/9/stats`,
  );
  assert.equal(
    viaProxy('https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/2027/types/2/leaders?limit=50', PROXY),
    `${PROXY}/core/seasons/2027/types/2/leaders?limit=50`,
  );
  assert.equal(viaProxy('https://site.web.api.espn.com/apis/common/v3/search?query=jok', PROXY), `${PROXY}/search?query=jok`);
});

test('anything that is not ESPN passes straight through', () => {
  assert.equal(viaProxy('https://a.espncdn.com/i/headshots/nba/players/full/1.png', PROXY), 'https://a.espncdn.com/i/headshots/nba/players/full/1.png');
});
