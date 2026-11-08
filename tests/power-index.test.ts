import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { normalizePowerIndex } from '../src/lib/espn';

// A real power index response (the 2026-27 season's), trimmed to four teams and the stats the app reads.
const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/power-index.json', import.meta.url), 'utf8'));

test('power index: teams in ESPN\'s order with the rating, its two halves, the record and the projection', () => {
  const rows = normalizePowerIndex(FIXTURE);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((r) => r.rank), [1, 2, 3, 4]);
  const top = rows[0];
  assert.equal(top.teamId.length > 0, true);
  assert.ok(top.bpi > 0);
  // The rating is its offense and its defense added up.
  assert.ok(Math.abs(top.offense + top.defense - top.bpi) < 0.01);
  assert.equal(top.wins + top.losses > 0, true);
  assert.ok(Math.abs(top.projWins + top.projLosses - 82) < 0.5);
});

test('power index: chances are percentages, the title chance below the Finals chance', () => {
  for (const r of normalizePowerIndex(FIXTURE)) {
    assert.ok(r.title >= 0 && r.title <= 100);
    assert.ok(r.title <= r.finals + 1e-9);
    assert.ok(r.finals <= r.playoffs + 1e-9);
  }
});

test('power index: an empty response has no rows; a team without an id is skipped', () => {
  assert.deepEqual(normalizePowerIndex({}), []);
  assert.deepEqual(normalizePowerIndex({ items: [{ team: {}, stats: [] }] }), []);
});
