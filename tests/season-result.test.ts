import assert from 'node:assert/strict';
import test from 'node:test';

import { seasonResult } from '../src/lib/league';

let n = 0;
const game = (opponentId: string, result: 'W' | 'L', extra: Record<string, unknown> = {}) =>
  ({
    id: String(n),
    // One day after the other, in a form that sorts as text.
    date: `${new Date(Date.UTC(2020, 0, 1 + n++)).toISOString().slice(0, 10)}T00:00Z`,
    home: true,
    opponent: `Team ${opponentId}`,
    opponentAbbr: opponentId,
    opponentLogo: '',
    opponentId,
    completed: true,
    result,
    ...extra,
  }) as never;

/** A regular season of `count` games against a rotation of teams, then what follows (built after it, so it comes after it in time). */
const season = (count: number, ...post: (() => unknown)[]) => {
  n = 0;
  const regular = Array.from({ length: count }, (_, i) => game(`R${i % 5}`, i % 2 ? 'W' : 'L'));
  return [...regular, ...post.flatMap((p) => p() as never[])];
};
const series = (id: string, wins: number, losses: number) => () => [
  ...Array.from({ length: wins }, () => game(id, 'W')),
  ...Array.from({ length: losses }, () => game(id, 'L')),
];
const one = (id: string, result: 'W' | 'L', extra: Record<string, unknown> = {}) => () => [game(id, result, extra)];

test('no games after the regular season: the playoffs were missed', () => {
  const r = seasonResult(season(82), 82, 2010)!;
  assert.deepEqual([r.stage, r.rounds, r.label], ['missed', 0, 'Missed the playoffs']);
});

test('play-in games (told by their note) and nothing after: lost in the play-in; with a playoff series after them it is that series that counts', () => {
  const lost = seasonResult(season(82, one('P1', 'L', { note: 'West Play-In Tournament' })), 82, 2023)!;
  assert.equal(lost.stage, 'play-in');
  const through = seasonResult(season(82, one('P1', 'W', { note: 'West Play-In Tournament' }), series('A', 1, 4)), 82, 2023)!;
  assert.deepEqual([through.stage, through.rounds, through.detail], ['r1', 1, 'Lost 1–4 to Team A']);
});

test('the k-th series is round k: second round, conference finals, Finals', () => {
  assert.equal(seasonResult(season(82, series('A', 4, 1), series('B', 2, 4)), 82, 2015)!.stage, 'r2');
  assert.equal(seasonResult(season(82, series('A', 4, 1), series('B', 4, 2), series('C', 0, 4)), 82, 2015)!.stage, 'r3');
  const finals = seasonResult(season(82, series('A', 4, 0), series('B', 4, 1), series('C', 4, 2), series('D', 3, 4)), 82, 2015)!;
  assert.deepEqual([finals.stage, finals.label, finals.rounds, finals.detail], ['finals', 'Lost in the NBA Finals', 4, 'Lost 3–4 to Team D']);
});

test('winning the fourth series is the title', () => {
  const r = seasonResult(season(82, series('A', 4, 0), series('B', 4, 1), series('C', 4, 2), series('D', 4, 2)), 82, 2015)!;
  assert.deepEqual([r.stage, r.label, r.detail], ['champions', 'NBA champions', 'Beat Team D 4–2']);
});

test('a Cup knockout game is not in the record and is not a playoff game; group play is', () => {
  n = 0;
  const games = [...Array.from({ length: 82 }, (_, i) => game(`R${i % 5}`, 'W', i === 20 ? { cup: 'Quarterfinals' } : i === 21 ? { cup: 'Group Play' } : {}))];
  // 81 games count toward the record (82 minus the knockout game): the 82nd game in date order is then a postseason one, and is a playoff series of one game.
  const r = seasonResult(games, 81, 2025)!;
  assert.equal(r.stage, 'missed');
});

test('the first round was best-of-five until 2002-03: three wins win it', () => {
  const old = seasonResult(season(82, series('A', 3, 2), series('B', 1, 4)), 82, 2003)!;
  assert.equal(old.stage, 'r2');
  // The same three wins in a later season are not a won series.
  const later = seasonResult(season(82, series('A', 3, 2)), 82, 2010)!;
  assert.match(later.detail ?? '', /^Lost/);
});

test('the record not known: no result', () => {
  assert.equal(seasonResult(season(82), undefined, 2010), null);
  assert.equal(seasonResult(season(82), 0, 2010), null);
});
