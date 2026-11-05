import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { GameLogEntry, Play } from '../src/lib/espn';
import { clockSeconds, clutchBoard, clutchLines } from '../src/lib/game';
import { efficiencyOf, formOf, rankByForm } from '../src/lib/league';

const game = (over: Partial<GameLogEntry> = {}): GameLogEntry => ({
  gameId: '1', date: '', home: true, opponentId: '2', opponent: 'X', opponentLogo: '', teamScore: 100, opponentScore: 90,
  min: 30, pts: 20, reb: 5, ast: 4, stl: 1, blk: 0, to: 2, pf: 2, fg: '7-15', tp: '2-5', ft: '4-4', ...over,
});

test('form compares the last five games with the rest of the season', () => {
  const hot = [...Array.from({ length: 5 }, () => game({ pts: 34, reb: 9, ast: 8 })), ...Array.from({ length: 10 }, () => game())];
  const cold = [...Array.from({ length: 5 }, () => game({ pts: 8, reb: 2, ast: 1 })), ...Array.from({ length: 10 }, () => game())];
  assert.ok(formOf(hot)!.delta > 10);
  assert.ok(formOf(cold)!.delta < -10);
  assert.equal(formOf(hot)!.pts, 34);
});

test('form needs a real sample and ignores cameos', () => {
  assert.equal(formOf(Array.from({ length: 5 }, () => game())), null); // too few games to compare against
  assert.equal(formOf(Array.from({ length: 6 }, () => game()))!.window, 3); // a young season looks at the last three
  assert.equal(formOf(Array.from({ length: 12 }, () => game()))!.window, 5);
  const withCameos = [...Array.from({ length: 5 }, () => game()), ...Array.from({ length: 10 }, () => game({ min: 3, pts: 0 }))];
  assert.equal(formOf(withCameos), null); // the cameos are not games
});

test('players are ranked hottest first', () => {
  const log = (pts: number) => [...Array.from({ length: 5 }, () => game({ pts })), ...Array.from({ length: 6 }, () => game())];
  const ranked = rankByForm([
    { who: 'steady', log: log(20) },
    { who: 'cold', log: log(6) },
    { who: 'hot', log: log(35) },
    { who: 'nolog', log: undefined },
  ]);
  assert.deepEqual(ranked.map((r) => r.who), ['hot', 'steady', 'cold']);
});

const play = (over: Partial<Play>): Play => ({
  id: '1', period: 4, clockText: '4:00', text: '', typeText: 'Jump Shot', teamId: '10', homeScore: 90, awayScore: 90, scoring: true,
  scoreValue: 2, shooting: true, pointsAttempted: 2, athleteIds: ['p1'], ...over,
});

test('clock text becomes seconds', () => {
  assert.equal(clockSeconds('4:43'), 283);
  assert.equal(clockSeconds('38.2'), 38.2);
  assert.equal(clockSeconds('0.0'), 0);
  assert.equal(clockSeconds('12:00'), 720);
});

test('clutch counts shots in the last five minutes of a close fourth quarter only', () => {
  const plays: Play[] = [
    play({ id: 'a', period: 3, clockText: '2:00', athleteIds: ['p9'] }), // third quarter
    play({ id: 'b', clockText: '6:10', athleteIds: ['p9'] }), // too early
    play({ id: 'c', clockText: '4:30', awayScore: 92, homeScore: 90, athleteIds: ['p1'] }), // clutch make, 2 pts (margin 0 before)
    play({ id: 'd', clockText: '3:10', scoring: false, scoreValue: 0, awayScore: 92, homeScore: 90, athleteIds: ['p1'] }), // clutch miss
    play({ id: 'e', clockText: '2:00', pointsAttempted: 1, scoreValue: 1, awayScore: 93, homeScore: 90, athleteIds: ['p2'], teamId: '11' }), // free throw
    play({ id: 'f', clockText: '1:00', awayScore: 105, homeScore: 90, athleteIds: ['p3'] }), // margin 15 before this shot? see below
  ];
  // The margin is read before each shot: after 'e' it is 3, so 'f' (taken at 3) still counts; its result opens the lead to 15.
  const lines = clutchLines(plays);
  const byId = Object.fromEntries(lines.map((l) => [l.playerId, l]));
  assert.equal(byId.p9, undefined);
  assert.deepEqual(byId.p1, { playerId: 'p1', teamId: '10', pts: 2, fgm: 1, fga: 2, ftm: 0, fta: 0 });
  assert.deepEqual(byId.p2, { playerId: 'p2', teamId: '11', pts: 1, fgm: 0, fga: 0, ftm: 1, fta: 1 });
  assert.equal(byId.p3.pts, 2);
  // Once the game is out of reach, later shots do not count.
  const blowout = clutchLines([play({ id: 'x', clockText: '4:00', awayScore: 110, homeScore: 90 }), play({ id: 'y', clockText: '3:00', awayScore: 112, homeScore: 90, athleteIds: ['p5'] })]);
  assert.equal(blowout.some((l) => l.playerId === 'p5'), false);
});

test('the board merges games and ranks by clutch points', () => {
  const a = { playerId: 'p1', teamId: '1', pts: 4, fgm: 2, fga: 3, ftm: 0, fta: 0 };
  const b = { playerId: 'p2', teamId: '2', pts: 7, fgm: 2, fga: 4, ftm: 3, fta: 3 };
  const board = clutchBoard([[a], [b, { ...a, pts: 5, fgm: 2, fga: 2 }]]);
  assert.deepEqual(board.map((l) => [l.playerId, l.pts]), [['p1', 9], ['p2', 7]]);
  assert.equal(board[0].fga, 5);
});

test('efficiency per game counts misses and turnovers against a player', () => {
  // 20 + 5 + 4 + 1 + 0 - (15-7) - (4-4) - 2 = 20
  assert.equal(efficiencyOf(Array.from({ length: 3 }, () => game())), 20);
  assert.equal(efficiencyOf(Array.from({ length: 2 }, () => game())), null);
  const sloppy = game({ fg: '2-14', ft: '0-4', to: 6 }); // 20 + 5 + 4 + 1 - 12 - 4 - 6 = 8
  assert.equal(efficiencyOf([sloppy, sloppy, sloppy]), 8);
});
