import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { normalizeInjuries, normalizeTransactions } from '../src/lib/espn';

// A real injury report and transactions page, trimmed to three teams (and one with nobody hurt) and four moves.
const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/wire.json', import.meta.url), 'utf8'));

test('injuries: by team, a team with nobody hurt left out, each player with his id, status and what is wrong', () => {
  const teams = normalizeInjuries(FIXTURE.injuries);
  assert.equal(teams.length, 3);
  assert.deepEqual(teams.map((t) => t.teamName), [...teams.map((t) => t.teamName)].sort());
  const hawks = teams.find((t) => t.teamName === 'Atlanta Hawks')!;
  const gilbert = hawks.injuries.find((p) => p.name === 'Keshon Gilbert')!;
  assert.equal(gilbert.id, '4585618');
  assert.equal(gilbert.status, 'Out');
  assert.equal(gilbert.detail, 'Left knee · Inflammation');
  assert.equal(gilbert.returnDate, '2026-11-09');
  assert.match(gilbert.note ?? '', /out for Saturday/);
  assert.ok(gilbert.headshot);
});

test('injuries: newest news first within a team', () => {
  for (const t of normalizeInjuries(FIXTURE.injuries)) {
    const dates = t.injuries.map((p) => p.updated);
    assert.deepEqual([...dates].sort().reverse(), dates);
  }
});

test('injuries: a record without a player or an empty report gives nothing', () => {
  assert.deepEqual(normalizeInjuries({}), []);
  assert.deepEqual(normalizeInjuries({ injuries: [{ id: '1', displayName: 'X', injuries: [{ status: 'Out', athlete: {} }] }] }), []);
});

test('transactions: the moves with their team and day, and the season total', () => {
  const { total, items } = normalizeTransactions(FIXTURE.transactions);
  assert.equal(items.length, 4);
  assert.ok(total >= items.length);
  assert.match(items[0].text, /two-way contract/);
  assert.equal(items[0].teamId.length > 0, true);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length, 'unique ids');
  assert.deepEqual(normalizeTransactions({}), { total: 0, items: [] });
});
