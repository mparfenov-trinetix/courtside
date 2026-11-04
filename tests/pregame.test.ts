import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { moneylineToDecimal, normalizeGameSummary } from '../src/lib/espn';
import type { HeadToHeadGame } from '../src/lib/espn';
import { buildCatchUp, conferenceStanding, summarizeHeadToHead, visibleSeeds } from '../src/lib/league';
import { gameHeat, parseLiveStatus } from '../src/lib/game';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/game-pregame.json', import.meta.url), 'utf8'));
const game = normalizeGameSummary(fixture, '401909922');

test('American moneylines become decimal odds', () => {
  assert.equal(moneylineToDecimal(-119), 1.84);
  assert.equal(moneylineToDecimal(101), 2.01);
  assert.equal(moneylineToDecimal(-345), 1.29);
  assert.equal(moneylineToDecimal(454), 5.54);
});

test('a scheduled game carries ESPN win probability that adds up to 100', () => {
  assert.equal(game.completed, false);
  const p = game.pregame.winProb;
  assert.ok(p);
  assert.ok(Math.abs(p.home + p.away - 100) < 0.2);
});

test('the sportsbook line is read per side, favorite flagged', () => {
  const odds = game.pregame.odds;
  assert.ok(odds);
  assert.equal(odds.provider, 'DraftKings');
  assert.equal(odds.home.favorite, true);
  assert.equal(odds.home.decimal, 1.84);
  assert.equal(odds.away.decimal, 2.01);
  assert.equal(odds.overUnder, 217.5);
});

test('form is the last five results per team, oldest first, from that team\'s side', () => {
  for (const side of [game.home, game.away]) {
    const form = game.pregame.form[side.team.id];
    assert.equal(form.length, 5);
    assert.deepEqual(form.map((g) => g.date), [...form.map((g) => g.date)].sort());
    for (const g of form) assert.equal(g.result === 'W', g.teamScore > g.opponentScore);
  }
});

test('missing pregame data is simply absent', () => {
  const bare = normalizeGameSummary({ header: fixture.header }, '1');
  assert.equal(bare.pregame.winProb, undefined);
  assert.equal(bare.pregame.odds, undefined);
  assert.deepEqual(bare.pregame.form, {});
});

const meeting = (id: string, result: 'W' | 'L', teamScore: number, opponentScore: number): HeadToHeadGame => ({
  id, date: `2026-01-0${id}`, home: true, opponent: 'X', opponentAbbr: 'X', opponentLogo: '', opponentId: '2', completed: true, result, teamScore, opponentScore,
});

test('head-to-head summary: record, scoring and current streak (newest first)', () => {
  const s = summarizeHeadToHead([meeting('4', 'W', 110, 100), meeting('3', 'W', 100, 90), meeting('2', 'L', 90, 100), meeting('1', 'W', 120, 110)]);
  assert.deepEqual([s.played, s.wins, s.losses], [4, 3, 1]);
  assert.equal(s.avgFor, 105);
  assert.equal(s.avgAgainst, 100);
  assert.deepEqual(s.streak, { result: 'W', count: 2 });
  assert.equal(summarizeHeadToHead([]).streak, null);
});

test('game heat: close and clutch only late in the fourth quarter or overtime', () => {
  assert.deepEqual(parseLiveStatus('3:12 - 4th'), { period: 4, seconds: 192 });
  assert.equal(parseLiveStatus('Halftime'), null);
  assert.equal(gameHeat(100, 98, '1:30 - 4th').level, 'clutch');
  assert.equal(gameHeat(100, 104, '4:10 - 4th').level, 'close');
  assert.equal(gameHeat(100, 108, '1:00 - 4th').level, 'none');
  assert.equal(gameHeat(100, 99, '8:00 - 3rd').level, 'none');
  assert.equal(gameHeat(100, 99, '2:00 - OT').label, 'Clutch time');
  assert.equal(gameHeat(undefined, undefined, '1:00 - 4th').level, 'none');
});

test('catch-up: results, a standing move and watched players since you left', () => {
  const since = Date.parse('2026-11-01T12:00:00Z');
  const now = Date.parse('2026-11-04T12:00:00Z');
  const g = (id: string, date: string, result: 'W' | 'L') => ({
    id, date, home: true, opponent: 'Chicago', opponentAbbr: 'CHI', opponentLogo: '', opponentId: '4', completed: true, result, teamScore: 110, opponentScore: 100,
  });
  const items = buildCatchUp({
    since, now,
    schedule: [g('1', '2026-10-30T00:00:00Z', 'W'), g('2', '2026-11-02T00:00:00Z', 'L'), g('3', '2026-11-03T00:00:00Z', 'W')],
    seedBefore: 6, seedNow: 4,
    watched: [
      { id: '9', name: 'J. Brown', teamId: '2', log: [{ gameId: 'x', date: '2026-11-03T01:00:00Z', home: false, opponent: 'NY', result: 'W', pts: 25, reb: 6, ast: 3 } as never] },
      { id: '8', name: 'Old', teamId: '2', log: [{ gameId: 'y', date: '2026-10-20T01:00:00Z', home: true, opponent: 'LAL', pts: 1, reb: 1, ast: 1 } as never] },
    ],
  });
  assert.deepEqual(items.map((i) => i.kind), ['result', 'result', 'standing', 'player']);
  assert.equal(items[0].kind === 'result' && items[0].text, 'W 110–100 vs CHI');
  assert.equal(items[3].kind === 'player' && items[3].line, '25 pts · 6 reb · 3 ast');
  assert.deepEqual(buildCatchUp({ since: now - 60_000, now, schedule: [g('3', '2026-11-04T11:59:30Z', 'W')] }), []);
});

test('standings window: each team with a neighbor either side, small gaps filled', () => {
  assert.deepEqual(visibleSeeds([4, 8], 15), [3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(visibleSeeds([5, 6], 15), [4, 5, 6, 7]);
  assert.deepEqual(visibleSeeds([1, 14], 15), [1, 2, 13, 14, 15]);
  assert.deepEqual(visibleSeeds([15, 14], 15), [13, 14, 15]);
});

test('conference standing text: always the conference place, never the division', () => {
  const row = (teamId: string, seed: number) => ({ teamId, seed }) as never;
  const standings = { east: [row('1', 1), row('2', 7)], west: [row('3', 3), row('4', 12)] };
  assert.equal(conferenceStanding(standings, '2'), '7th in the East');
  assert.equal(conferenceStanding(standings, '3'), '3rd in the West');
  assert.equal(conferenceStanding(standings, '4'), '12th in the West');
  assert.equal(conferenceStanding(standings, '9'), undefined);
  assert.equal(conferenceStanding(undefined, '1'), undefined);
});
