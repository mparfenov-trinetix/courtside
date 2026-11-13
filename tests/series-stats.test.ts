import assert from 'node:assert/strict';
import test from 'node:test';

import { bestPerformances, seriesLeader } from '../src/lib/league';

const player = (id: string, name: string, stats: Record<string, string>, didNotPlay = false) =>
  ({ id, name, shortName: name, starter: true, didNotPlay, stats: { MIN: '30', FG: '5-10', FT: '2-2', OREB: '1', DREB: '3', STL: '1', BLK: '0', PF: '2', TO: '2', ...stats } }) as never;
const side = (teamId: string, players: unknown[]) => ({ team: { id: teamId }, starters: players, bench: [] }) as never;
const game = (id: string, home: unknown, away: unknown, completed = true) => ({ id, completed, home, away }) as never;

const games = [
  game('g1', side('H', [player('h1', 'Home Star', { PTS: '30', REB: '8', AST: '6' }), player('h2', 'Home Role', { PTS: '8', REB: '3', AST: '1' })]), side('A', [player('a1', 'Away Star', { PTS: '22', REB: '10', AST: '3' })])),
  game('g2', side('H', [player('h1', 'Home Star', { PTS: '20', REB: '6', AST: '4' }), player('h2', 'Home Role', { PTS: '10', REB: '5', AST: '2' })]), side('A', [player('a1', 'Away Star', { PTS: '34', REB: '11', AST: '5' }), player('a2', 'Cameo', { PTS: '40', REB: '1', AST: '0' })])),
];

test('a series leader is the best scoring average among players who played at least half the games', () => {
  const home = seriesLeader(games, 'H')!;
  assert.deepEqual([home.name, home.games, home.ppg, home.rpg, home.apg], ['Home Star', 2, '25.0', '7.0', '5.0']);
  const away = seriesLeader(games, 'A')!;
  // The cameo scored 40 in one game of two, which is half: he qualifies with 40 a game, ahead of the 28 of the star who played both.
  assert.equal(away.name, 'Cameo');
  // With a third game the cameo no longer has half.
  const three = [...games, game('g3', side('H', [player('h1', 'Home Star', { PTS: '2' })]), side('A', [player('a1', 'Away Star', { PTS: '20', REB: '4', AST: '2' })]))];
  assert.equal(seriesLeader(three, 'A')!.name, 'Away Star');
});

test('a player who did not play, or has no minutes, is not counted; a game not over is not counted; no games: no leader', () => {
  const g = [game('g1', side('H', [player('x', 'Bench Warmer', { PTS: '99', MIN: '0' }), player('y', 'Out', { PTS: '99' }, true)]), side('A', []))];
  assert.equal(seriesLeader(g, 'H'), null);
  assert.equal(seriesLeader([game('g9', side('H', [player('h1', 'Home Star', { PTS: '30' })]), side('A', []), false)], 'H'), null);
  assert.equal(seriesLeader([], 'H'), null);
});

test('the best performances are ranked by Game Score, at most one per player, and only from games that were played', () => {
  const best = bestPerformances(games, 3);
  assert.equal(best[0].name, 'Cameo');
  assert.equal(new Set(best.map((b) => b.athleteId)).size, best.length);
  assert.deepEqual(best.map((b) => b.gameId), ['g2', 'g2', 'g1'].slice(0, best.length).map((x, i) => best[i].gameId));
  assert.ok(best.every((b, i) => i === 0 || best[i - 1].score >= b.score));
  assert.deepEqual(bestPerformances([game('g1', side('H', [player('h1', 'X', { PTS: '50' })]), side('A', []), false)]), []);
});
