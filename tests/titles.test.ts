import assert from 'node:assert/strict';
import { test } from 'node:test';

import { titleSeasons } from '../src/lib/league';

test('titles: seasons spent on the champion, newest first, ignoring combined lines', () => {
  const rows = [
    { year: 2012, abbr: 'MIA' }, { year: 2013, abbr: 'MIA' }, { year: 2014, abbr: 'MIA' },
    { year: 2016, abbr: 'CLE' }, { year: 2018, abbr: 'LAL' }, { year: 2020, abbr: 'LAL' },
    { year: 2020, abbr: 'TOT' },
  ];
  assert.deepEqual(titleSeasons(rows), [2020, 2016, 2013, 2012]);
});

test('titles: a traded season counts if any of his teams won it, and never twice', () => {
  const rows = [{ year: 2024, abbr: 'MIA' }, { year: 2024, abbr: 'BOS' }, { year: 2024, abbr: 'TOT' }];
  assert.deepEqual(titleSeasons(rows), [2024]);
});

test('titles: none for a player who never won one', () => {
  assert.deepEqual(titleSeasons([{ year: 2021, abbr: 'CHA' }, { year: 2022, abbr: 'CHA' }]), []);
});
