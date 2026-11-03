import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { moneylineToDecimal, normalizeGameSummary } from '../src/lib/espn';
import type { HeadToHeadGame } from '../src/lib/espn';
import { summarizeHeadToHead } from '../src/lib/league';

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
