import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { impliedChance, normalizeFutures, parseMoneyline } from '../src/lib/espn';

// A real futures response (the 2026-27 season's), trimmed to four markets and their first eight lines.
const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/futures.json', import.meta.url), 'utf8'));
const markets = normalizeFutures(FIXTURE.json, FIXTURE.athletes);
const market = (key: string) => markets.find((m) => m.key === key)!;

test('moneylines: parsed, and turned into the probability they imply', () => {
  assert.equal(parseMoneyline('+295'), 295);
  assert.equal(parseMoneyline('-150'), -150);
  assert.equal(parseMoneyline('EVEN'), undefined);
  assert.equal(parseMoneyline(undefined), undefined);
  assert.equal(impliedChance(300), 0.25);
  assert.ok(Math.abs(impliedChance(-200) - 2 / 3) < 1e-9);
  assert.equal(impliedChance(100), 0.5);
});

test('futures: the markets found, favorite first, chances scaled to add up to one', () => {
  assert.deepEqual(markets.map((m) => m.key), ['title', 'east', 'mvp', 'coach']);
  for (const m of markets) {
    const sum = m.entries.reduce((s, e) => s + e.chance, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `${m.key} adds up to 1`);
    assert.deepEqual([...m.entries].sort((a, b) => b.chance - a.chance), m.entries, `${m.key} favorite first`);
  }
  const title = market('title');
  assert.equal(title.entries[0].kind, 'team');
  assert.equal(title.entries[0].line, '+295');
  assert.equal(title.entries[0].id, '24');
});

test('futures: an award market names its favorites (name, photo, team); a coach has no photo', () => {
  const mvp = market('mvp').entries[0];
  assert.equal(mvp.kind, 'athlete');
  assert.equal(mvp.name, 'Luka Doncic');
  assert.match(mvp.headshot ?? '', /3945274\.png$/);
  assert.equal(mvp.teamId, '13');
  // Past the favorites a candidate is only an id and a line.
  assert.equal(market('mvp').entries[7].name, undefined);
  const coach = market('coach').entries[0];
  assert.equal(coach.headshot, undefined);
});

test('futures: an empty response has no markets', () => {
  assert.deepEqual(normalizeFutures({}), []);
});
