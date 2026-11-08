import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildCup, cupIsOn, projectedField, type Conference } from '../src/lib/league';
import { cupStage, type CupGame } from '../src/lib/espn';

// 30 teams: ids 1-15 East (groups of five: 1-5, 6-10, 11-15), 16-30 West.
const side = (id: number, score?: number) => ({ teamId: String(id), abbr: `T${id}`, logo: '', score });
const conf: Record<string, Conference> = {};
for (let i = 1; i <= 30; i++) conf[String(i)] = i <= 15 ? 'east' : 'west';

/** Round robin inside a group; the lower id always wins by (gap) points, so standings are predictable. */
function league(played: boolean): CupGame[] {
  const games: CupGame[] = [];
  let n = 0;
  for (let g = 0; g < 6; g++) {
    const base = g * 5 + 1;
    for (let a = 0; a < 5; a++) {
      for (let b = a + 1; b < 5; b++) {
        const lo = base + a;
        const hi = base + b;
        games.push({
          id: `g${n++}`,
          date: `2026-11-${String(2 + (n % 20)).padStart(2, '0')}T00:00Z`,
          stage: 'Group Play',
          completed: played,
          home: side(lo, played ? 100 + (hi - lo) : undefined),
          away: side(hi, played ? 100 : undefined),
        });
      }
    }
  }
  return games;
}

test('stage names come from ESPN game notes', () => {
  assert.equal(cupStage('NBA Cup - Group Play'), 'Group Play');
  assert.equal(cupStage('NBA Cup - Quarterfinals'), 'Quarterfinals');
  // 2023-24 was the In-Season Tournament.
  assert.equal(cupStage('NBA In-Season Tournament - Group Play'), 'Group Play');
  assert.equal(cupStage('NBA In-Season Tournament Championship'), 'Championship');
  assert.equal(cupStage('Rivalry Week'), undefined);
  assert.equal(cupStage(undefined), undefined);
});

test('six groups of five are rebuilt from who plays whom', () => {
  const cup = buildCup(league(true), conf);
  assert.equal(cup.groups.length, 6);
  assert.ok(cup.groups.every((g) => g.rows.length === 5));
  assert.deepEqual(cup.groups.map((g) => g.label), ['East 1', 'East 2', 'East 3', 'West 1', 'West 2', 'West 3']);
});

test('standings: wins, record and point differential are tallied per team', () => {
  const g = buildCup(league(true), conf).groups[0];
  assert.deepEqual(g.rows.map((r) => r.abbr), ['T1', 'T2', 'T3', 'T4', 'T5']);
  assert.deepEqual([g.rows[0].w, g.rows[0].l], [4, 0]);
  assert.deepEqual([g.rows[4].w, g.rows[4].l], [0, 4]);
  assert.equal(g.rows[0].diff, 1 + 2 + 3 + 4);
  assert.ok(g.rows.every((r) => r.left === 0));
});

test('unplayed games count as games left, not as results', () => {
  const cup = buildCup(league(false), conf);
  assert.equal(cup.groupStageDone, false);
  assert.equal(cup.groupGamesLeft, 60);
  assert.ok(cup.groups.every((g) => g.rows.every((r) => r.w === 0 && r.left === 4)));
});

test('head-to-head breaks a two-way tie before point differential', () => {
  // A and B both finish 2-1; B beat A head to head, but A has the better point differential.
  const games: CupGame[] = [
    { id: '1', date: 'd', stage: 'Group Play', completed: true, home: side(1, 120), away: side(3, 100) }, // A beats C by 20
    { id: '2', date: 'd', stage: 'Group Play', completed: true, home: side(1, 120), away: side(4, 100) }, // A beats D by 20
    { id: '3', date: 'd', stage: 'Group Play', completed: true, home: side(2, 101), away: side(1, 100) }, // B beats A by 1
    { id: '4', date: 'd', stage: 'Group Play', completed: true, home: side(3, 100), away: side(2, 99) }, // C beats B by 1
    { id: '5', date: 'd', stage: 'Group Play', completed: true, home: side(2, 100), away: side(4, 99) }, // B beats D by 1
    { id: '6', date: 'd', stage: 'Group Play', completed: true, home: side(3, 90), away: side(4, 100) },
  ];
  const rows = buildCup(games, { '1': 'east', '2': 'east', '3': 'east', '4': 'east' }).groups[0].rows;
  const a = rows.find((r) => r.abbr === 'T1')!;
  const b = rows.find((r) => r.abbr === 'T2')!;
  assert.equal(a.w, 2);
  assert.equal(b.w, 2);
  assert.ok(a.diff > b.diff);
  assert.ok(b.rank < a.rank, 'B (won head to head) ranks above A despite the worse point differential');
});

test('the projected field is six group leaders plus one wildcard per conference', () => {
  const field = projectedField(buildCup(league(true), conf));
  assert.equal(field.length, 8);
  assert.equal(field.filter((r) => r.position === 'leader').length, 6);
  const wild = field.filter((r) => r.position === 'wildcard');
  assert.equal(wild.length, 2);
  // Every runner-up is 3-1 here; the East and West wildcards are the ones with the best point differential.
  assert.ok(wild.every((r) => r.rank === 2));
});

test('knockout games are kept apart from group play', () => {
  const ko: CupGame = { id: 'k', date: '2026-12-01T00:00Z', stage: 'Quarterfinals', completed: false, home: side(1), away: side(16) };
  const cup = buildCup([...league(true), ko], conf);
  assert.equal(cup.knockout.length, 1);
  assert.equal(cup.groupGames.length, 60);
  assert.equal(cup.groupStageDone, true);
});

test('nobody is marked leader or wild card before they have played', () => {
  const cup = buildCup(league(false), conf);
  assert.equal(projectedField(cup).length, 0);
});

test('cupIsOn: only while a Cup game of the team is to come or just played', () => {
  const now = Date.parse('2026-11-08T12:00:00Z');
  const day = 24 * 3600_000;
  const g = (cup: string | undefined, completed: boolean, offset: number) => ({ cup, completed, date: new Date(now + offset * day).toISOString() });
  assert.equal(cupIsOn(undefined, now), false);
  assert.equal(cupIsOn([g(undefined, true, -3)], now), false, 'no Cup game at all');
  assert.equal(cupIsOn([g('Group Play', false, 5)], now), true, 'a Cup game to come');
  assert.equal(cupIsOn([g('Group Play', true, -3)], now), true, 'played this week');
  assert.equal(cupIsOn([g('Group Play', true, -40)], now), false, 'the Cup ended weeks ago');
  assert.equal(cupIsOn([g('Group Play', true, -40), g('Quarterfinals', true, -2)], now), true, 'a knockout game just played');
});
