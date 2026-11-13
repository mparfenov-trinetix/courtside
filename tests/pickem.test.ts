import assert from 'node:assert/strict';
import test from 'node:test';

import {
  awaitingResult,
  favoriteOf,
  isLocked,
  isPickableKind,
  resultOf,
  settlePicks,
  summarizePicks,
  winnerFromScores,
  type GamePick,
} from '../src/lib/league';

const side = (id: string) => ({ id, abbr: id.toUpperCase(), logo: '' });
const pick = (id: string, day: number, teamId: string, extra: Partial<GamePick> = {}): GamePick => ({
  id,
  date: `2026-11-${String(day).padStart(2, '0')}T00:30Z`,
  away: side('a'),
  home: side('h'),
  teamId,
  madeAt: 0,
  ...extra,
});

test('a pick is open until tip-off, and a date that cannot be read is locked', () => {
  const tip = Date.parse('2026-11-10T00:30:00Z');
  assert.equal(isLocked('2026-11-10T00:30Z', tip - 1), false);
  assert.equal(isLocked('2026-11-10T00:30Z', tip), true);
  assert.equal(isLocked('nonsense'), true);
});

test('only games that count in a table can be picked', () => {
  for (const k of ['regular', 'playoffs', 'playin', 'cup-group', 'cup-knockout']) assert.ok(isPickableKind(k));
  assert.ok(!isPickableKind('allstar'));
  assert.ok(!isPickableKind('preseason'));
});

test('the favorite is the higher win chance, else the book\'s favorite, else the shorter price, else nobody', () => {
  assert.equal(favoriteOf('a', 'h', { winProb: { home: 61, away: 39 } }), 'h');
  assert.equal(favoriteOf('a', 'h', { winProb: { home: 40, away: 60 } }), 'a');
  // Level win chance falls through to the book.
  const odds = { home: { favorite: false, decimal: 2.1 }, away: { favorite: true, decimal: 1.8 } };
  assert.equal(favoriteOf('a', 'h', { winProb: { home: 50, away: 50 }, odds }), 'a');
  // No favorite flag: the shorter price.
  assert.equal(favoriteOf('a', 'h', { odds: { home: { favorite: false, decimal: 1.7 }, away: { favorite: false, decimal: 2.2 } } }), 'h');
  assert.equal(favoriteOf('a', 'h', {}), undefined);
  assert.equal(favoriteOf('a', 'h'), undefined);
});

test('the winner comes from the score, and nobody wins a level game', () => {
  assert.equal(winnerFromScores({ id: 'a', score: 101 }, { id: 'h', score: 99 }), 'a');
  assert.equal(winnerFromScores({ id: 'a', score: 90 }, { id: 'h', score: 99 }), 'h');
  assert.equal(winnerFromScores({ id: 'a', score: 99 }, { id: 'h', score: 99 }), undefined);
  assert.equal(winnerFromScores({ id: 'a' }, { id: 'h', score: 5 }), undefined);
});

test('settling records the winners it is given and returns the same array when nothing changed', () => {
  const picks = [pick('g1', 1, 'a'), pick('g2', 2, 'h')];
  const next = settlePicks(picks, { g1: 'a', g3: 'h' });
  assert.equal(resultOf(next[0]), 'win');
  assert.equal(resultOf(next[1]), 'pending');
  assert.equal(settlePicks(next, { g1: 'a' }), next);
  assert.equal(settlePicks(next, {}), next);
  assert.equal(resultOf(settlePicks(picks, { g2: 'a' })[1]), 'loss');
});

test('a pick awaits its result once the game must be over', () => {
  const picks = [pick('g1', 1, 'a'), pick('g2', 1, 'a', { winnerId: 'a' })];
  const tip = Date.parse('2026-11-01T00:30:00Z');
  assert.equal(awaitingResult(picks, tip + 3 * 3600_000).length, 0);
  assert.deepEqual(awaitingResult(picks, tip + 4 * 3600_000).map((p) => p.id), ['g1']);
});

test('the score card: record, accuracy, the run you are on and the best run', () => {
  // Oldest to newest: W W L W W W (picked 'a' each time; 'a' won except on the third day).
  const picks = [
    pick('g1', 1, 'a', { winnerId: 'a' }),
    pick('g2', 2, 'a', { winnerId: 'a' }),
    pick('g3', 3, 'a', { winnerId: 'h' }),
    pick('g4', 4, 'a', { winnerId: 'a' }),
    pick('g5', 5, 'a', { winnerId: 'a' }),
    pick('g6', 6, 'a', { winnerId: 'a' }),
    pick('g7', 7, 'a'),
  ];
  const s = summarizePicks(picks);
  assert.deepEqual([s.won, s.lost, s.pending], [5, 1, 1]);
  assert.ok(Math.abs(s.accuracy! - 5 / 6) < 1e-9);
  assert.deepEqual(s.streak, { kind: 'W', length: 3 });
  assert.equal(s.bestStreak, 3);
  // A pick made out of order is still counted by the game's date.
  assert.deepEqual(summarizePicks([pick('late', 9, 'a', { winnerId: 'h' }), pick('early', 1, 'a', { winnerId: 'a' })]).streak, { kind: 'L', length: 1 });
});

test('no results yet: no accuracy, no streak', () => {
  const s = summarizePicks([pick('g1', 1, 'a')]);
  assert.equal(s.accuracy, null);
  assert.equal(s.streak, null);
  assert.equal(s.pending, 1);
  assert.equal(summarizePicks([]).won, 0);
});

test('against the favorite: you, the favorite and the upsets you called', () => {
  const picks = [
    // Took the favorite and it won.
    pick('g1', 1, 'a', { favoriteId: 'a', winnerId: 'a' }),
    // Took the underdog and it won: an upset called, and the favorite lost.
    pick('g2', 2, 'a', { favoriteId: 'h', winnerId: 'a' }),
    // Took the favorite and it lost.
    pick('g3', 3, 'h', { favoriteId: 'h', winnerId: 'a' }),
    // No favorite known: counted in the record, not in the comparison.
    pick('g4', 4, 'a', { winnerId: 'a' }),
  ];
  const s = summarizePicks(picks);
  assert.deepEqual(s.versus, { games: 3, you: 2, favorite: 1 });
  assert.equal(s.upsets, 1);
  assert.equal(s.won, 3);
});
