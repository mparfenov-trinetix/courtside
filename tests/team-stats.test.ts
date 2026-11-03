import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { normalizeLeagueTeamStats } from '../src/lib/espn.ts';
import { formatMetric, metricByKey, ordinal, rankOf } from '../src/lib/team-stats.ts';

const rows = normalizeLeagueTeamStats(JSON.parse(readFileSync(new URL('./fixtures/league-team-stats.json', import.meta.url), 'utf8')));
const cha = rows.find((r) => r.abbr === 'CHA')!;

test('the league table is parsed into per-game numbers for each team', () => {
  assert.equal(rows.length, 4);
  assert.ok(cha.gp > 0);
  assert.ok(cha.ppg > 80 && cha.ppg < 140);
  assert.ok(Math.abs(cha.diff - (cha.ppg - cha.oppPpg)) < 1e-9);
  assert.ok(cha.threePct > 20 && cha.threePct < 50);
});

test('ranks run best to worst, and lower-is-better stats flip the order', () => {
  const sorted = [...rows].sort((a, b) => b.ppg - a.ppg);
  assert.equal(rankOf(rows, sorted[0].teamId, metricByKey('ppg')), 1);
  assert.equal(rankOf(rows, sorted[3].teamId, metricByKey('ppg')), 4);
  const fewest = [...rows].sort((a, b) => a.tov - b.tov)[0];
  assert.equal(rankOf(rows, fewest.teamId, metricByKey('tov')), 1);
});

test('tied values share the better rank', () => {
  const tied = [
    { ...cha, teamId: '1', ppg: 100 },
    { ...cha, teamId: '2', ppg: 100 },
    { ...cha, teamId: '3', ppg: 90 },
  ];
  assert.equal(rankOf(tied, '1', metricByKey('ppg')), 1);
  assert.equal(rankOf(tied, '2', metricByKey('ppg')), 1);
  assert.equal(rankOf(tied, '3', metricByKey('ppg')), 3);
});

test('formatting: signed differentials, percentages and ordinals', () => {
  assert.equal(formatMetric(metricByKey('diff'), 4.25), '+4.3');
  assert.equal(formatMetric(metricByKey('diff'), -1.2), '-1.2');
  assert.equal(formatMetric(metricByKey('threePct'), 34.04), '34.0%');
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd']);
});
