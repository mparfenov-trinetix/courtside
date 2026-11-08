import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NBA2K_TOP_COUNT, nba2kRating } from '../src/lib/league';

test('2K27 Top 100 (2K Ratings, 2026-11-08): the numbers, matched by name however ESPN spells it', () => {
  assert.equal(NBA2K_TOP_COUNT, 100);
  assert.deepEqual(nba2kRating('Shai Gilgeous-Alexander'), { name: 'Shai Gilgeous-Alexander', overall: 97, rank: 1 });
  assert.equal(nba2kRating('Nikola Jokic')?.overall, 96); // no accent
  assert.equal(nba2kRating('Luka Doncic')?.rank, 3);
  assert.equal(nba2kRating('VJ Edgecombe')?.overall, 82); // no dots
  assert.equal(nba2kRating('Jaren Jackson Jr.')?.overall, 86);
  assert.equal(nba2kRating('Jrue Holiday')?.rank, 100);
  assert.equal(nba2kRating('Walker Kessler')?.overall, 84); // moved up from 81 in the launch list
  // Spelled as ESPN does: 2K Ratings has "Alexandre" and "C.J.", and "Alexandre" would miss ("C.J." matches either way).
  assert.equal(nba2kRating('Alex Sarr')?.overall, 81);
  assert.equal(nba2kRating('CJ McCollum')?.overall, 83);
  assert.equal(nba2kRating('C.J. McCollum')?.overall, 83);
});

test('a player outside the Top 100, or no name, has no 2K rating', () => {
  assert.equal(nba2kRating('Some Bench Player'), null);
  assert.equal(nba2kRating('Tobias Harris'), null); // in the launch list, out of the current one
  assert.equal(nba2kRating(undefined), null);
});

test('the list is in rank order: ratings never go up as the rank goes down', () => {
  const names = ['Shai Gilgeous-Alexander', 'Stephen Curry', 'Tyrese Maxey', 'LeBron James', 'Tyrese Haliburton', 'Franz Wagner', 'Josh Giddey', 'Jrue Holiday'];
  const ovr = names.map((n) => nba2kRating(n)!.overall);
  for (let i = 1; i < ovr.length; i++) assert.ok(ovr[i] <= ovr[i - 1]);
});
