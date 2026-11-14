import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Player, PlayerSeasonStats } from '../src/lib/espn';
import { barShare, compareTeammates, formatCategory, lineupsFrom, rankByCategory, rosterMakeup, startsByPlayer } from '../src/lib/league';

const p = (id: string, extra: Partial<Player> = {}): Player => ({ id, name: `Player ${id}`, shortName: id, ...extra });

const roster: Player[] = [
  p('1', { position: 'PG', age: 24, experience: 3, heightCm: 188, weightKg: 84, country: 'United States' }),
  p('2', { position: 'SF', age: 31, experience: 10, heightCm: 203, weightKg: 100, country: 'Serbia' }),
  p('3', { position: 'C', age: 20, experience: 0, heightCm: 216, weightKg: 118, country: 'France' }),
  p('4', { position: 'SG', age: 27, experience: 6, heightCm: 196, weightKg: 91, country: 'Serbia' }),
  p('5', { position: 'PF' }),
];
const stats: Record<string, PlayerSeasonStats> = {
  '1': { ppg: 21.5, rpg: 4, apg: 7.1, threePct: 0.39 },
  '2': { ppg: 18, rpg: 6.5, apg: 3 },
  '3': { ppg: 9.2, rpg: 8.8 },
};

test('rank by a stat: biggest first, players without the number left out', () => {
  const ranked = rankByCategory(roster, (id) => stats[id], 'ppg');
  assert.deepEqual(ranked.map((r) => r.player.id), ['1', '2', '3']);
  assert.equal(ranked[0]!.value, 21.5);
});

test('rank by a fact of the roster needs no stats', () => {
  assert.deepEqual(rankByCategory(roster, () => undefined, 'age').map((r) => r.player.id), ['2', '4', '1', '3']);
  assert.deepEqual(rankByCategory(roster, () => undefined, 'height').map((r) => r.player.id), ['3', '2', '4', '1']);
});

test('equal numbers keep roster order', () => {
  const twin = [p('a', { age: 25 }), p('b', { age: 25 }), p('c', { age: 30 })];
  assert.deepEqual(rankByCategory(twin, () => undefined, 'age').map((r) => r.player.id), ['c', 'a', 'b']);
});

test('numbers are written the way the app writes them', () => {
  assert.equal(formatCategory('ppg', 21.46), '21.5');
  assert.equal(formatCategory('threePct', 0.388), '39%');
  assert.equal(formatCategory('fgPct', 48.7), '49%');
  assert.equal(formatCategory('experience', 0), 'Rookie');
  assert.equal(formatCategory('experience', 1), '1 yr');
  assert.equal(formatCategory('experience', 6), '6 yrs');
  assert.equal(formatCategory('height', 203), `6' 8"`);
  assert.equal(formatCategory('weight', 100), '220 lbs');
});

test('a bar is never empty and never longer than its box', () => {
  assert.equal(barShare(10, 20), 0.5);
  assert.equal(barShare(0, 20), 0.04);
  assert.equal(barShare(30, 20), 1);
  assert.equal(barShare(5, 0), 0.04);
});

test('the makeup of a roster', () => {
  const m = rosterMakeup(roster);
  assert.equal(m.count, 5);
  assert.equal(m.rookies, 1);
  assert.equal(m.veterans, 1);
  assert.equal(m.youngest?.id, '3');
  assert.equal(m.oldest?.id, '2');
  assert.equal(m.tallest?.id, '3');
  assert.deepEqual(m.positions, { G: 2, F: 2, C: 1, other: 0 });
  assert.equal(m.international, 3);
  assert.equal(m.countries, 2);
  assert.equal(Math.round(m.avgAge ?? 0), 26);
});

test('an empty roster has no averages and no one in front', () => {
  const m = rosterMakeup([]);
  assert.equal(m.count, 0);
  assert.equal(m.avgAge, undefined);
  assert.equal(m.youngest, undefined);
});

test('starting fives: the same five in any order are one lineup, the most used first', () => {
  const games = [
    { gameId: 'g1', won: true, starterIds: ['1', '2', '3', '4', '5'] },
    { gameId: 'g2', won: false, starterIds: ['5', '4', '3', '2', '1'] },
    { gameId: 'g3', won: true, starterIds: ['1', '2', '3', '4', '6'] },
    { gameId: 'g4', won: true, starterIds: ['1', '2', '3'] },
  ];
  const lineups = lineupsFrom(games);
  assert.equal(lineups.length, 2);
  assert.deepEqual(lineups[0], { key: '1|2|3|4|5', ids: ['1', '2', '3', '4', '5'], games: 2, wins: 1 });
  assert.equal(lineups[1]!.games, 1);
  assert.deepEqual(startsByPlayer(games), { '1': 4, '2': 4, '3': 4, '4': 3, '5': 2, '6': 1 });
});

test('two teammates side by side: who leads each row, and no leader where bigger is not better', () => {
  const rows = compareTeammates({ player: roster[0]!, stats: stats['1'] }, { player: roster[1]!, stats: stats['2'] });
  const row = (key: string) => rows.find((r) => r.key === key)!;
  assert.equal(row('ppg').leader, 'a');
  assert.equal(row('rpg').leader, 'b');
  assert.equal(row('apg').leader, 'a');
  assert.equal(row('age').leader, null);
  assert.equal(row('spg').leader, null);
  assert.equal(row('height').b, 203);
});
