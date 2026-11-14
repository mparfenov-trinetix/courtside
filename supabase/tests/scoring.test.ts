import assert from 'node:assert/strict';
import { test } from 'node:test';

import { summarizePicks, winnerFromScores as appWinnerFromScores, type GamePick } from '../../src/lib/league/pickem.ts';
import {
  classifyStatus,
  decideSettlement,
  isPickableKind,
  rankPlayers,
  summarizeUser,
  winnerFromScores,
  type IncomingGame,
  type SettledPick,
  type StoredGame,
} from '../functions/_shared/scoring.ts';

test('ESPN statuses become ours', () => {
  assert.equal(classifyStatus('STATUS_SCHEDULED', 'pre', false), 'scheduled');
  assert.equal(classifyStatus('STATUS_IN_PROGRESS', 'in', false), 'in_progress');
  assert.equal(classifyStatus('STATUS_HALFTIME', 'in', false), 'in_progress');
  assert.equal(classifyStatus('STATUS_END_PERIOD', 'in', false), 'in_progress');
  assert.equal(classifyStatus('STATUS_FINAL', 'post', true), 'final');
  assert.equal(classifyStatus('STATUS_FINAL', 'post', undefined), 'final');
  assert.equal(classifyStatus('STATUS_POSTPONED', 'post', false), 'postponed');
  assert.equal(classifyStatus('STATUS_CANCELED', 'post', false), 'canceled');
  assert.equal(classifyStatus('STATUS_FORFEIT', 'post', false), 'canceled');
  // Something ESPN has not told us about reads as not started, never as final.
  assert.equal(classifyStatus('STATUS_SOMETHING_NEW', undefined, undefined), 'scheduled');
  assert.equal(classifyStatus(undefined, undefined, undefined), 'scheduled');
});

test('only games that are in a table can be picked', () => {
  for (const kind of ['regular', 'playoffs', 'playin', 'cup-group', 'cup-knockout']) assert.equal(isPickableKind(kind), true, kind);
  for (const kind of ['allstar', 'preseason', 'whatever']) assert.equal(isPickableKind(kind), false, kind);
});

test('the winner is the higher score, and nobody while level or unknown (same as the app)', () => {
  const cases: [number | undefined | null, number | undefined | null][] = [
    [100, 90],
    [90, 100],
    [100, 100],
    [undefined, 100],
    [100, null],
    [0, 0],
  ];
  for (const [a, h] of cases) {
    const ours = winnerFromScores({ id: 'A', score: a }, { id: 'H', score: h });
    const theirs = appWinnerFromScores({ id: 'A', score: a ?? undefined }, { id: 'H', score: h ?? undefined });
    assert.equal(ours, theirs, `${a} - ${h}`);
  }
  assert.equal(winnerFromScores({ id: 'A', score: 101 }, { id: 'H', score: 99 }), 'A');
});

const game = (over: Partial<IncomingGame>): IncomingGame => ({ id: 'g', status: 'scheduled', awayId: 'A', homeId: 'H', ...over });

test('a final game is settled once, with ESPN\'s winner or the higher score', () => {
  assert.deepEqual(decideSettlement(undefined, game({ status: 'final', awayScore: 90, homeScore: 100 })), { kind: 'settle', winnerId: 'H' });
  // ESPN's own flag wins over the score arithmetic.
  assert.deepEqual(decideSettlement(undefined, game({ status: 'final', awayScore: 90, homeScore: 100, winnerId: 'A' })), { kind: 'settle', winnerId: 'A' });
  // A winner flag naming a team that is not in the game is not trusted.
  assert.deepEqual(decideSettlement(undefined, game({ status: 'final', awayScore: 90, homeScore: 100, winnerId: 'X' })), { kind: 'settle', winnerId: 'H' });
  // No score, no flag: cannot tell, do nothing.
  assert.deepEqual(decideSettlement(undefined, game({ status: 'final' })), { kind: 'none' });
  assert.deepEqual(decideSettlement(undefined, game({ status: 'final', awayScore: 100, homeScore: 100 })), { kind: 'none' });
});

test('settling is idempotent, and repairs a correction', () => {
  const done: StoredGame = { status: 'final', winnerTeamId: 'H', settledAt: '2026-11-14T03:00:00Z' };
  const final = game({ status: 'final', awayScore: 90, homeScore: 100 });
  assert.deepEqual(decideSettlement(done, final), { kind: 'none' });
  // ESPN corrected the winner.
  assert.deepEqual(decideSettlement(done, game({ status: 'final', winnerId: 'A' })), { kind: 'settle', winnerId: 'A' });
  // The row says final but was never settled (a run died halfway): settle it.
  assert.deepEqual(decideSettlement({ status: 'final', winnerTeamId: null, settledAt: null }, final), { kind: 'settle', winnerId: 'H' });
  // A game that was voided and then played.
  assert.deepEqual(decideSettlement({ status: 'postponed' }, final), { kind: 'settle', winnerId: 'H' });
});

test('a postponed or canceled game is voided once, and a game never stored has nothing to void', () => {
  assert.deepEqual(decideSettlement({ status: 'scheduled' }, game({ status: 'postponed' })), { kind: 'void', as: 'postponed' });
  assert.deepEqual(decideSettlement({ status: 'in_progress' }, game({ status: 'canceled' })), { kind: 'void', as: 'canceled' });
  assert.deepEqual(decideSettlement({ status: 'postponed' }, game({ status: 'postponed' })), { kind: 'none' });
  assert.deepEqual(decideSettlement(undefined, game({ status: 'postponed' })), { kind: 'none' });
});

test('a postponed game that is put on again gets its picks back; ordinary games do nothing', () => {
  assert.deepEqual(decideSettlement({ status: 'postponed' }, game({ status: 'scheduled' })), { kind: 'reopen' });
  assert.deepEqual(decideSettlement({ status: 'canceled' }, game({ status: 'scheduled' })), { kind: 'reopen' });
  assert.deepEqual(decideSettlement({ status: 'scheduled' }, game({ status: 'scheduled' })), { kind: 'none' });
  assert.deepEqual(decideSettlement(undefined, game({ status: 'scheduled' })), { kind: 'none' });
  assert.deepEqual(decideSettlement({ status: 'scheduled' }, game({ status: 'in_progress' })), { kind: 'none' });
});

// --- the leaderboard maths against the app's -------------------------------------------------------------------------------------------

/** A tiny deterministic generator, so the "random" data is the same on every run. */
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function settledPicks(seed: number, count: number): SettledPick[] {
  const rand = lcg(seed);
  const picks: SettledPick[] = [];
  for (let i = 0; i < count; i++) {
    const away = `A${i}`;
    const home = `H${i}`;
    const pickedAway = rand() < 0.5;
    const awayWon = rand() < 0.5;
    const hasFavorite = rand() < 0.8;
    picks.push({
      gameId: `g${String(i).padStart(3, '0')}`,
      // One game an hour: distinct start times, so the app's sort (by start only) and ours (start, then id) agree.
      tipOff: Date.UTC(2026, 10, 1) + i * 3_600_000,
      teamId: pickedAway ? away : home,
      favoriteId: hasFavorite ? (rand() < 0.6 ? (awayWon ? away : home) : awayWon ? home : away) : null,
      winnerId: awayWon ? away : home,
    });
  }
  return picks;
}

const toAppPick = (p: SettledPick): GamePick => ({
  id: p.gameId,
  date: new Date(p.tipOff).toISOString(),
  away: { id: `A${p.gameId.slice(1).replace(/^0+/, '') || '0'}`, abbr: 'AWY', logo: '' },
  home: { id: `H${p.gameId.slice(1).replace(/^0+/, '') || '0'}`, abbr: 'HME', logo: '' },
  teamId: p.teamId,
  madeAt: 0,
  favoriteId: p.favoriteId ?? undefined,
  winnerId: p.winnerId,
});

test('summarizeUser gives the same record, streaks, versus and upsets as the app\'s summarizePicks', () => {
  for (const [seed, count] of [[1, 1], [2, 5], [3, 12], [4, 40], [5, 120]] as const) {
    const picks = settledPicks(seed, count);
    const mine = summarizeUser(picks);
    const app = summarizePicks(picks.map(toAppPick));
    assert.equal(mine.wins, app.won, `wins, seed ${seed}`);
    assert.equal(mine.losses, app.lost, `losses, seed ${seed}`);
    assert.equal(mine.accuracy, app.accuracy, `accuracy, seed ${seed}`);
    assert.deepEqual(mine.streak, app.streak, `streak, seed ${seed}`);
    assert.equal(mine.bestStreak, app.bestStreak, `best streak, seed ${seed}`);
    assert.deepEqual(mine.versus, app.versus, `versus, seed ${seed}`);
    assert.equal(mine.upsets, app.upsets, `upsets, seed ${seed}`);
  }
});

test('before the first result there is no accuracy and no streak', () => {
  const s = summarizeUser([]);
  assert.equal(s.accuracy, null);
  assert.equal(s.streak, null);
  assert.equal(s.bestStreak, 0);
});

test('the seed data of seed.sql ranks as documented: equal wins and accuracy share a rank, best streak breaks the listing order', () => {
  // alice: win, loss, win (an upset on g3); bob: loss, win (upset on g2), win; carol: win, win, loss.
  const pick = (gameId: string, tipOff: number, teamId: string, favoriteId: string | null, winnerId: string): SettledPick => ({ gameId, tipOff, teamId, favoriteId, winnerId });
  const g = [Date.UTC(2026, 10, 1), Date.UTC(2026, 10, 2), Date.UTC(2026, 10, 3)];
  const alice = summarizeUser([pick('g1', g[0]!, '2', '2', '2'), pick('g2', g[1]!, '18', '18', '11'), pick('g3', g[2]!, '9', '12', '9')]);
  const bob = summarizeUser([pick('g1', g[0]!, '17', '2', '2'), pick('g2', g[1]!, '11', '18', '11'), pick('g3', g[2]!, '9', '9', '9')]);
  const carol = summarizeUser([pick('g1', g[0]!, '2', '2', '2'), pick('g2', g[1]!, '11', null, '11'), pick('g3', g[2]!, '12', '12', '9')]);
  assert.deepEqual([alice.wins, alice.losses, alice.bestStreak, alice.streak, alice.upsets], [2, 1, 1, { kind: 'W', length: 1 }, 1]);
  assert.deepEqual([bob.wins, bob.losses, bob.bestStreak, bob.streak, bob.upsets], [2, 1, 2, { kind: 'W', length: 2 }, 1]);
  assert.deepEqual([carol.wins, carol.losses, carol.bestStreak, carol.streak, carol.upsets], [2, 1, 2, { kind: 'L', length: 1 }, 0]);

  const board = rankPlayers([
    { username: 'alice_seed', summary: alice },
    { username: 'bob_seed', summary: bob },
    { username: 'carol_seed', summary: carol },
  ]);
  assert.deepEqual(board.map((r) => [r.username, r.rank]), [['bob_seed', 1], ['carol_seed', 1], ['alice_seed', 1]]);
});

test('ranks are competition ranks (ties share one and skip the next: 1, 2, 3, 3, 5); most wins first, then accuracy; players with no result are last', () => {
  const s = (wins: number, losses: number, bestStreak = 0) => ({
    wins,
    losses,
    accuracy: wins + losses ? wins / (wins + losses) : null,
    streak: null,
    bestStreak,
    versus: { games: 0, you: 0, favorite: 0 },
    upsets: 0,
  });
  const board = rankPlayers([
    { username: 'zed', summary: s(0, 0) },
    { username: 'ann', summary: s(5, 5) },
    { username: 'bea', summary: s(5, 5) },
    { username: 'cal', summary: s(9, 1) },
    { username: 'dee', summary: s(5, 1) },
  ]);
  assert.deepEqual(board.map((r) => [r.username, r.rank]), [['cal', 1], ['dee', 2], ['ann', 3], ['bea', 3], ['zed', 5]].map(([n, r]) => [n, r]));
});
