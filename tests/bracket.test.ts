import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildCupBracket, buildPlayIn, buildPlayoffs, layoutTree, parsePlayInNote, parsePlayoffNote } from '../src/lib/bracket.ts';
import type { CupGame } from '../src/lib/espn.ts';

const side = (id: number, score?: number) => ({ teamId: String(id), abbr: `T${id}`, logo: '', score });
let n = 0;
/** One game; `hs`/`as` are the home/away scores (omit for a game not yet played). */
const game = (stage: string, home: number, away: number, hs?: number, as?: number): CupGame => ({
  id: `g${n++}`,
  date: `2027-04-${String(10 + (n % 15)).padStart(2, '0')}T00:00Z`,
  stage,
  completed: hs != null,
  home: side(home, hs),
  away: side(away, as),
});

test('playoff notes map to rounds, conferences and game numbers', () => {
  assert.deepEqual(parsePlayoffNote('West 1st Round - Game 3'), { round: 'r1', conference: 'west', game: 3 });
  assert.deepEqual(parsePlayoffNote('East Semifinals - Game 7'), { round: 'r2', conference: 'east', game: 7 });
  assert.deepEqual(parsePlayoffNote('West Finals - Game 6'), { round: 'r3', conference: 'west', game: 6 });
  assert.deepEqual(parsePlayoffNote('NBA Finals - Game 2'), { round: 'finals', conference: undefined, game: 2 });
  assert.equal(parsePlayoffNote('NBA Cup - Group Play'), null);
});

test('play-in notes', () => {
  assert.deepEqual(parsePlayInNote('NBA Play-In - East - 9th Place vs 10th Place'), { conference: 'east', title: '9th Place vs 10th Place' });
  assert.equal(parsePlayInNote('East 1st Round - Game 1'), null);
});

// East seeds 1-6 are teams 1-6; the 7 and 8 seeds (teams 7, 8) only appear in the games.
const seeds: Record<string, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8 };

function eastRoundOne(): CupGame[] {
  const pairs: [number, number][] = [[2, 7], [1, 8], [4, 5], [3, 6]]; // deliberately out of bracket order
  return pairs.flatMap(([hi, lo]) => [
    game('East 1st Round - Game 1', hi, lo, 110, 100),
    game('East 1st Round - Game 2', hi, lo, 105, 100),
    game('East 1st Round - Game 3', lo, hi, 90, 100),
    game('East 1st Round - Game 4', lo, hi, 95, 100),
  ]);
}

test('a series is the games between two teams: wins, winner, status', () => {
  const po = buildPlayoffs(eastRoundOne(), seeds);
  const s = po.rounds[0].series[0];
  assert.equal(s.games.length, 4);
  assert.equal(s.topWins, 4);
  assert.equal(s.bottomWins, 0);
  assert.equal(s.winnerId, s.top.teamId);
  assert.equal(s.status, `${s.top.abbr} wins 4-0`);
});

test('first-round series are ordered 1v8, 4v5, 3v6, 2v7 and seeds 7 and 8 are worked out', () => {
  const r1 = buildPlayoffs(eastRoundOne(), { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 }).rounds[0].series;
  assert.deepEqual(r1.map((s) => s.top.seed), [1, 4, 3, 2]);
  assert.deepEqual(r1.map((s) => s.bottom.seed), [8, 5, 6, 7]); // 7 and 8 inferred as 9 minus the top seed
});

test('a series in progress reads as a lead, a tie, or a start date', () => {
  const lead = buildPlayoffs([game('East 1st Round - Game 1', 1, 8, 100, 90), game('East 1st Round - Game 2', 1, 8, 99, 101), game('East 1st Round - Game 3', 8, 1, 80, 90)], seeds).rounds[0].series[0];
  assert.equal(lead.status, 'T1 leads 2-1');
  const tied = buildPlayoffs([game('East 1st Round - Game 1', 1, 8, 100, 90), game('East 1st Round - Game 2', 1, 8, 99, 101)], seeds).rounds[0].series[0];
  assert.equal(tied.status, 'Series tied 1-1');
  const fresh = buildPlayoffs([game('East 1st Round - Game 1', 1, 8)], seeds).rounds[0].series[0];
  assert.match(fresh.status, /^Starts /);
});

test('later rounds line up beside the series their teams came from', () => {
  const games = [
    ...eastRoundOne(),
    // Second round: 4 (beat 5) vs 1 (beat 8), and 2 (beat 7) vs 3 (beat 6)
    game('East Semifinals - Game 1', 1, 4, 100, 90),
    game('East Semifinals - Game 1', 2, 3, 100, 90),
  ];
  const r2 = buildPlayoffs(games, seeds).rounds.find((r) => r.key === 'r2')!.series;
  const top = r2[0];
  assert.deepEqual([top.top.teamId, top.bottom.teamId].sort(), ['1', '4'], 'the 1v8 and 4v5 winners meet in the top half');
});

test('tree layout centers each series between its feeders', () => {
  const games = [...eastRoundOne(), game('East Semifinals - Game 1', 1, 4, 100, 90), game('East Semifinals - Game 1', 2, 3, 100, 90)];
  const east = buildPlayoffs(games, seeds).sections[0];
  const { placements, height } = layoutTree(east.rounds, 60, 10);
  const y = (col: number, i: number) => placements.filter((p) => p.col === col)[i].y;
  assert.equal(y(0, 0), 0);
  assert.equal(y(0, 1), 70);
  assert.equal(y(1, 0), (y(0, 0) + y(0, 1)) / 2);
  assert.equal(y(1, 1), (y(0, 2) + y(0, 3)) / 2);
  assert.equal(height, 3 * 70 + 60);
});

test('play-in: three single games per conference, in bracket order', () => {
  const games = [
    game('NBA Play-In - East - 9th Place vs 10th Place', 9, 10, 100, 90),
    game('NBA Play-In - East - 8th Seed Game', 8, 9, 99, 101),
    game('NBA Play-In - East - 7th Place vs 8th Place', 7, 8, 110, 100),
  ];
  const round = buildPlayIn(games, seeds)!;
  assert.deepEqual(round.series.map((s) => s.title), ['7th Place vs 8th Place', '9th Place vs 10th Place', '8th Seed Game']);
  assert.equal(round.series[0].status, 'T7 wins 110-100');
  assert.equal(round.series[2].winnerId, '9');
});

test('Cup knockout: quarterfinals, semifinals and the championship, East half first', () => {
  const ko = [
    game('Championship', 1, 5, 120, 110),
    game('Semifinals', 1, 2, 100, 90),
    game('Semifinals', 5, 6, 100, 90),
    game('Quarterfinals', 5, 7, 100, 90), // west
    game('Quarterfinals', 6, 8, 100, 90), // west
    game('Quarterfinals', 1, 3, 100, 90), // east
    game('Quarterfinals', 2, 4, 100, 90), // east
  ];
  const conf = { 1: 'east', 2: 'east', 3: 'east', 4: 'east', 5: 'west', 6: 'west', 7: 'west', 8: 'west' } as const;
  const rounds = buildCupBracket(ko, conf as unknown as Record<string, 'east' | 'west'>);
  assert.deepEqual(rounds.map((r) => r.series.length), [4, 2, 1]);
  assert.deepEqual(rounds[0].series.map((s) => s.conference), ['east', 'east', 'west', 'west']);
  assert.equal(rounds[2].series[0].winnerId, '1');
});
