import assert from 'node:assert/strict';
import test from 'node:test';

import { LEADER_CATEGORIES, minutesClock, statByName } from '../src/lib/espn';

// Trimmed from a real season record (core API `types/2/athletes/{id}/statistics/0`).
const record = {
  splits: {
    categories: [
      { name: 'general', stats: [{ name: 'gamesPlayed', value: 10 }] },
      {
        name: 'offensive',
        stats: [
          { name: 'threePointPct', value: 57.895 },
          { name: 'avgFieldGoalsMade', value: 3.6 },
          { name: 'avgThreePointFieldGoalsMade', value: 1.1 },
          { name: 'avgFreeThrowsMade', value: 2.1 },
        ],
      },
    ],
  },
};

test('statByName finds a per-game number in any category of the record', () => {
  assert.equal(statByName(record, 'avgThreePointFieldGoalsMade'), 1.1);
  assert.equal(statByName(record, 'avgFreeThrowsMade'), 2.1);
  assert.equal(statByName(record, 'gamesPlayed'), 10);
});

test('statByName is undefined for a missing stat or an empty record', () => {
  assert.equal(statByName(record, 'avgSteals'), undefined);
  assert.equal(statByName({}, 'avgFieldGoalsMade'), undefined);
});

test('the percentage categories are shown whole and name the made-per-game stat they read', () => {
  for (const key of ['tppct', 'fgpct', 'ftpct'] as const) {
    const c = LEADER_CATEGORIES[key];
    assert.equal(c.percent, true);
    assert.equal(c.digits, 0);
    assert.match(c.made, /^avg/);
  }
});

test('minutes per game are a clock, not a decimal', () => {
  assert.equal(minutesClock(37.3636360168457), '37:22');
  assert.equal(minutesClock(36.25), '36:15');
  assert.equal(minutesClock(30), '30:00');
  assert.equal(minutesClock(29.999), '30:00');
});
