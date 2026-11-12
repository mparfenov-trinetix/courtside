import assert from 'node:assert/strict';
import test from 'node:test';

import { pickKeyMatchup, positionGroup } from '../src/lib/league';

const p = (athleteId: string, position: string, ppg: string) => ({ athleteId, name: athleteId, shortName: athleteId, position, ppg, rpg: '5.0', apg: '3.0' });
const out = (athleteId: string, status = 'Out') => ({ teamId: '1', athleteId, name: athleteId, status });

test('positions fall into guards, forwards and centers', () => {
  assert.deepEqual(['PG', 'SG', 'G', 'G-F', 'SF', 'PF', 'F', 'F-C', 'C', 'C-F', undefined, 'X'].map(positionGroup), ['G', 'G', 'G', 'G', 'F', 'F', 'F', 'F', 'C', 'C', null, null]);
});

test('key matchup: the best pair of the same position, not the two best players', () => {
  // Away's best is a guard and home's best a center: they do not match, so the pair is the highest of one position (forwards).
  const away = [p('a-guard', 'G', '30'), p('a-fwd', 'F', '22'), p('a-c', 'C', '10')];
  const home = [p('h-c', 'C', '28'), p('h-fwd', 'F', '21'), p('h-guard', 'G', '12')];
  const m = pickKeyMatchup(away, home)!;
  // Guard pair costs 0 + 2, forward pair 1 + 1, center pair 2 + 0: all equal, so the pair that scores more wins (forwards 22 + 21 = 43, guards 42).
  assert.deepEqual([m.away.athleteId, m.home.athleteId, m.group], ['a-fwd', 'h-fwd', 'F']);
  // Make one pair clearly higher up both rankings.
  const m2 = pickKeyMatchup([p('a1', 'F', '25'), p('a2', 'G', '20')], [p('h1', 'G', '27'), p('h2', 'F', '26')])!;
  assert.deepEqual([m2.away.athleteId, m2.home.athleteId], ['a1', 'h2']);
});

test('key matchup: a player who is out is never shown, a day-to-day one is, flagged', () => {
  const away = [p('star', 'F', '28'), p('next', 'F', '20')];
  const home = [p('rival', 'F', '27')];
  assert.equal(pickKeyMatchup(away, home, [out('star')])!.away.athleteId, 'next');
  const dtd = pickKeyMatchup(away, home, [out('star', 'Day-To-Day')])!;
  assert.equal(dtd.away.athleteId, 'star');
  assert.equal(dtd.awayStatus, 'Day-to-day');
  assert.equal(dtd.homeStatus, undefined);
});

test('key matchup: with no shared position the two best are matched, and with nobody left there is none', () => {
  const m = pickKeyMatchup([p('a', 'G', '20')], [p('h', 'C', '20')])!;
  assert.deepEqual([m.away.athleteId, m.home.athleteId, m.group], ['a', 'h', null]);
  assert.equal(pickKeyMatchup([p('a', 'G', '20')], [p('h', 'C', '20')], [out('h')]), null);
});
