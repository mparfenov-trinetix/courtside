import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NBA2K_TOP_COUNT, nba2kRating } from '../src/lib/league';

test('2K27 Top 100: the published numbers, matched by name however ESPN spells it', () => {
  assert.equal(NBA2K_TOP_COUNT, 100);
  assert.deepEqual(nba2kRating('Shai Gilgeous-Alexander'), { name: 'Shai Gilgeous-Alexander', overall: 97, rank: 1 });
  assert.equal(nba2kRating('Nikola Jokic')?.overall, 97); // no accent
  assert.equal(nba2kRating('Luka Doncic')?.rank, 4);
  assert.equal(nba2kRating('VJ Edgecombe')?.overall, 83); // no dots
  assert.equal(nba2kRating('Jaren Jackson Jr.')?.overall, 86);
  assert.equal(nba2kRating('Walker Kessler')?.rank, 100);
});

test('a player outside the Top 100, or no name, has no 2K rating', () => {
  assert.equal(nba2kRating('Some Bench Player'), null);
  assert.equal(nba2kRating(undefined), null);
});

test('the list is in rank order: ratings never go up as the rank goes down', () => {
  const names = ['Shai Gilgeous-Alexander', 'Stephen Curry', 'Tyrese Maxey', 'LeBron James', 'Tyrese Haliburton', 'Franz Wagner', 'Josh Giddey', 'Tobias Harris'];
  const ovr = names.map((n) => nba2kRating(n)!.overall);
  for (let i = 1; i < ovr.length; i++) assert.ok(ovr[i] <= ovr[i - 1]);
});
