import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { tricode } from '../src/lib/espn';

test('every team has a three-letter code, the NBA\'s own', () => {
  const teams = JSON.parse(readFileSync(new URL('./fixtures/team-colors.json', import.meta.url), 'utf8')) as { abbreviation: string }[];
  const codes = teams.map((t) => tricode(t.abbreviation));
  for (const c of codes) assert.match(c, /^[A-Z]{3}$/, c);
  assert.equal(new Set(codes).size, 30);
  assert.deepEqual(['GS', 'NO', 'NY', 'SA', 'UTAH', 'WSH', 'BOS'].map(tricode), ['GSW', 'NOP', 'NYK', 'SAS', 'UTA', 'WAS', 'BOS']);
});
