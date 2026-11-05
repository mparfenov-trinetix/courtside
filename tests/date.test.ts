import assert from 'node:assert/strict';
import { test } from 'node:test';

import { kickoffLabel, parseEspnDate, scoreboardKeysFor, startsOnDay, toNbaDateKey } from '../src/lib/date';

// Built from local parts, so the expectations hold in any time zone.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

test('kickoff label: today, tomorrow and yesterday are named', () => {
  const now = at(2026, 11, 4, 12).getTime();
  assert.equal(kickoffLabel(at(2026, 11, 4, 19, 30).toISOString(), now), 'Today · 19:30');
  assert.equal(kickoffLabel(at(2026, 11, 5, 1, 0).toISOString(), now), 'Tomorrow · 01:00');
  assert.equal(kickoffLabel(at(2026, 11, 3, 2, 5).toISOString(), now), 'Yesterday · 02:05');
});

test('kickoff label: further out it is the date', () => {
  const now = at(2026, 11, 4, 12).getTime();
  assert.equal(kickoffLabel(at(2026, 11, 6, 1, 0).toISOString(), now), '06.11.2026 · 01:00');
  assert.equal(kickoffLabel(at(2025, 4, 8, 3, 30).toISOString(), now), '08.04.2025 · 03:30');
});

test('kickoff label: an unreadable date is empty', () => {
  assert.equal(kickoffLabel('', 0), '');
});

test('kickoff label: reads ESPN dates that have no seconds', () => {
  const start = at(2026, 11, 5, 1, 0);
  const iso = start.toISOString().replace(/:\d\d\.\d{3}Z$/, 'Z');
  assert.equal(kickoffLabel(iso, at(2026, 11, 4, 12).getTime()), 'Tomorrow · 01:00');
});

test('the scoreboards for a local day cover every moment of it', () => {
  // Whatever the machine's own time zone, each hour of a local day has its Eastern scoreboard key among the day's keys.
  const day = new Date(2026, 10, 5);
  const keys = scoreboardKeysFor(day);
  assert.ok(keys.length >= 1 && keys.length <= 2);
  for (let h = 0; h < 24; h++) assert.ok(keys.includes(toNbaDateKey(new Date(2026, 10, 5, h, 30))), `hour ${h}`);
});

test('a game belongs to the day it starts on for the device, not to the Eastern one', () => {
  const iso = '2026-11-05T01:00Z';
  const start = parseEspnDate(iso);
  assert.equal(startsOnDay(iso, new Date(start.getFullYear(), start.getMonth(), start.getDate())), true);
  assert.equal(startsOnDay(iso, new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)), false);
});

test('parseEspnDate reads timestamps without seconds', () => {
  assert.equal(parseEspnDate('2026-11-03T00:30Z').toISOString(), '2026-11-03T00:30:00.000Z');
});
