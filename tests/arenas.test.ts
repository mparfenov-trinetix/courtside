import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ARENAS, arenaOf, milesBetween } from '../src/lib/league';

test('every one of the 30 franchises has an arena on the map', () => {
  const ids = Object.keys(ARENAS).map(Number).sort((a, b) => a - b);
  assert.equal(ids.length, 30);
  assert.deepEqual(ids, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
  for (const a of Object.values(ARENAS)) {
    assert.ok(a.name && a.city);
    // Inside the box the map is drawn in (the lower 48 and southern Ontario).
    assert.ok(a.lat > 24.5 && a.lat < 50 && a.lon > -125 && a.lon < -66, a.name);
  }
});

test('an id that is not a franchise has no arena', () => {
  assert.equal(arenaOf('31'), undefined);
  assert.equal(arenaOf(null), undefined);
  assert.equal(arenaOf('7')?.name, 'Ball Arena');
});

test('distances between arenas are road-trip sized', () => {
  const den = ARENAS['7']!;
  const no = ARENAS['3']!;
  assert.ok(Math.abs(milesBetween(den, no) - 1070) < 40);
  assert.equal(milesBetween(den, den), 0);
  // New York to Brooklyn is a few miles.
  assert.ok(milesBetween(ARENAS['18']!, ARENAS['17']!) < 8);
});
