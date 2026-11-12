import assert from 'node:assert/strict';
import test from 'node:test';

import { meetingsSummary, playerHeadToHead } from '../src/lib/league';

const g = (gameId: string, date: string, opponentId: string, opponent: string, teamScore: number, opponentScore: number, pts: number, reb = 5, ast = 5) =>
  ({ gameId, date, opponentId, opponent, teamScore, opponentScore, pts, reb, ast, min: 34 }) as never;

test('player head to head: the same game, opposite teams, newest first', () => {
  // A plays for BOS (id 2), B for PHI (id 20).
  const a = [g('1', '2026-01-12', '20', 'PHI', 116, 115, 30), g('2', '2026-02-01', '5', 'CLE', 100, 90, 25), g('3', '2026-03-10', '20', 'PHI', 99, 104, 22)];
  const b = [g('1', '2026-01-12', '2', 'BOS', 115, 116, 28), g('9', '2026-02-01', '9', 'DAL', 80, 90, 18), g('3', '2026-03-10', '2', 'BOS', 104, 99, 31)];
  const m = playerHeadToHead(a, b);
  assert.deepEqual(m.map((x) => x.gameId), ['3', '1']);
  assert.deepEqual([m[0].teamA, m[0].teamB, m[0].scoreA, m[0].scoreB, m[0].a.pts, m[0].b.pts], ['BOS', 'PHI', 99, 104, 22, 31]);
  const s = meetingsSummary(m);
  assert.deepEqual([s.games, s.winsA, s.winsB], [2, 1, 1]);
  assert.equal(s.a.pts, 26);
  assert.equal(s.b.pts, 29.5);
});

test('player head to head: teammates in a game are not a meeting', () => {
  // Same opponent in both logs: they played on the same side.
  const a = [g('1', '2026-01-12', '20', 'PHI', 116, 115, 30)];
  const b = [g('1', '2026-01-12', '20', 'PHI', 116, 115, 12)];
  assert.deepEqual(playerHeadToHead(a, b), []);
  assert.deepEqual(meetingsSummary([]), { games: 0, winsA: 0, winsB: 0, a: { pts: 0, reb: 0, ast: 0 }, b: { pts: 0, reb: 0, ast: 0 } });
});
