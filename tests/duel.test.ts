import assert from 'node:assert/strict';
import test from 'node:test';

import { pickGameDuel } from '../src/lib/game';

const p = (id: string, pts: number, reb = 3, ast = 3, didNotPlay = false) =>
  ({ id, name: id, shortName: id, starter: true, didNotPlay, stats: { PTS: String(pts), REB: String(reb), AST: String(ast) } }) as never;

test('a scoring duel: both 30+ and within 6 points of each other', () => {
  const d = pickGameDuel([p('a', 35)], [p('h', 32)])!;
  assert.deepEqual([d.away.id, d.home.id, d.kind], ['a', 'h', 'points']);
  assert.equal(pickGameDuel([p('a', 44)], [p('h', 39)])!.kind, 'points');
  // 7 apart is no duel, and 29 is under the bar.
  assert.equal(pickGameDuel([p('a', 40)], [p('h', 33)]), null);
  assert.equal(pickGameDuel([p('a', 31)], [p('h', 29)]), null);
  // The gap is exactly 6.
  assert.ok(pickGameDuel([p('a', 38)], [p('h', 32)]));
});

test('an all-round duel: both 40+ in points, rebounds and assists, within 6 of each other', () => {
  const d = pickGameDuel([p('a', 20, 10, 10)], [p('h', 22, 10, 8)])!;
  assert.deepEqual([d.away.id, d.home.id, d.kind], ['a', 'h', 'allround']);
  // One of them short of 40, or too far apart.
  assert.equal(pickGameDuel([p('a', 20, 10, 10)], [p('h', 20, 10, 9)]), null);
  assert.equal(pickGameDuel([p('a', 20, 10, 10)], [p('h', 30, 12, 12)]), null);
});

test('a scoring duel wins over an all-round one, and the best pair is the one whose lesser player did more', () => {
  const d = pickGameDuel([p('a1', 31), p('a2', 36)], [p('h1', 33), p('h2', 20, 12, 12)])!;
  // 36 against 33 beats 31 against 33.
  assert.deepEqual([d.away.id, d.home.id, d.kind], ['a2', 'h1', 'points']);
});

test('players who did not play never make a duel, and a game with none has none', () => {
  assert.equal(pickGameDuel([p('a', 35, 3, 3, true)], [p('h', 32)]), null);
  assert.equal(pickGameDuel([], []), null);
  assert.equal(pickGameDuel([p('a', 12)], [p('h', 14)]), null);
});
