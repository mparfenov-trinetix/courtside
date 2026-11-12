import assert from 'node:assert/strict';
import test from 'node:test';

import { lastNameOf, namesScale } from '../src/lib/league';

test('last names, without suffixes', () => {
  assert.equal(lastNameOf('Jaren Jackson Jr.'), 'Jackson');
  assert.equal(lastNameOf('Karl-Anthony Towns'), 'Towns');
  assert.equal(lastNameOf('Nickeil Alexander-Walker'), 'Alexander-Walker');
  assert.equal(lastNameOf('Kevin Porter Jr'), 'Porter');
  assert.equal(lastNameOf('Shai Gilgeous-Alexander'), 'Gilgeous-Alexander');
  assert.equal(lastNameOf('Nene'), 'Nene');
});

test('the names share one size: full when they fit together, smaller by the same factor when not', () => {
  assert.equal(namesScale('Stephen Curry', 'Jayson Tatum'), 1);
  // A long name beside a short one still fits at full size.
  assert.equal(namesScale('Giannis Antetokounmpo', 'LeBron James'), 1);
  assert.equal(namesScale('Stephen Curry', 'Giannis Antetokounmpo'), 1);
  // Two long ones do not: both smaller, never below half.
  const wa = namesScale('Victor Wembanyama', 'Giannis Antetokounmpo');
  assert.ok(wa < 1 && wa > 0.8, String(wa));
  const longest = namesScale('Shai Gilgeous-Alexander', 'Nickeil Alexander-Walker');
  assert.ok(longest >= 0.5 && longest < 0.65, String(longest));
});
