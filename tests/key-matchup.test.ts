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
  const away = [p('a-guard', 'G', '30'), p('a-fwd', 'F', '22'), p('a-c', 'C', '21')];
  const home = [p('h-c', 'C', '28'), p('h-fwd', 'F', '23'), p('h-guard', 'G', '20')];
  const m = pickKeyMatchup(away, home)!;
  // Guard pair costs 0 + 2, forward pair 1 + 1, center pair 2 + 0: all equal, so the pair that scores more wins (guards 30 + 20 = 50, centers 49, forwards 45).
  assert.deepEqual([m.away.athleteId, m.home.athleteId, m.group], ['a-guard', 'h-guard', 'G']);
  // One pair clearly higher up both rankings.
  const m2 = pickKeyMatchup([p('a1', 'F', '25'), p('a2', 'G', '20')], [p('h1', 'G', '27'), p('h2', 'F', '26'), p('h3', 'C', '21')])!;
  assert.deepEqual([m2.away.athleteId, m2.home.athleteId], ['a1', 'h2']);
});

test('key matchup: a player who is out is never shown, a day-to-day one is, flagged', () => {
  const away = [p('star', 'F', '28'), p('next', 'F', '21')];
  const home = [p('rival', 'F', '27')];
  assert.equal(pickKeyMatchup(away, home, [out('star')])!.away.athleteId, 'next');
  const dtd = pickKeyMatchup(away, home, [out('star', 'Day-To-Day')])!;
  assert.equal(dtd.away.athleteId, 'star');
  assert.equal(dtd.awayStatus, 'Day-to-day');
  assert.equal(dtd.homeStatus, undefined);
});

test('key matchup: only a real one: two stars (20+ a game, top three of their team) of one position, else none', () => {
  // Same position but a role player (18.6) across from a star.
  assert.equal(pickKeyMatchup([p('a', 'F', '18.6')], [p('h', 'F', '25.7')]), null);
  // Two scorers, but not of one position.
  assert.equal(pickKeyMatchup([p('a', 'G', '25')], [p('h', 'C', '25')]), null);
  // A star who is out leaves no one good enough behind him.
  assert.equal(pickKeyMatchup([p('a', 'F', '25'), p('b', 'F', '12')], [p('h', 'F', '25')], [out('a')]), null);
  // Fourth on his team's list does not count, however much he scores.
  assert.equal(pickKeyMatchup([p('x', 'G', '30'), p('y', 'G', '29'), p('z', 'G', '28'), p('w', 'F', '27')], [p('h', 'F', '25')]), null);
  // Nobody on a team.
  assert.equal(pickKeyMatchup([], [p('h', 'F', '25')]), null);
});
