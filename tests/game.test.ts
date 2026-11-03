import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { normalizeGameSummary } from '../src/lib/espn';
import { buildFourFactors, deriveFlow, deriveQuarterStats, sumLineups, sumPeriods } from '../src/lib/game';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/game-final.json', import.meta.url), 'utf8'));
const game = normalizeGameSummary(fixture, '401909912');
const { home, away, plays } = game;

const derived = deriveQuarterStats(
  plays,
  [
    { teamId: away.team.id, starterIds: away.starters.map((p) => p.id) },
    { teamId: home.team.id, starterIds: home.starters.map((p) => p.id) },
  ],
  home.team.id,
);
const allPeriods = derived.periods;

test('the fixture parses into a finished game with two full box scores', () => {
  assert.equal(game.completed, true);
  assert.ok(plays.length > 400);
  assert.ok(home.starters.length === 5 && away.starters.length === 5);
});

test('per-period player lines add back up to the official box score', () => {
  for (const team of [home, away]) {
    for (const p of [...team.starters, ...team.bench]) {
      const line = sumPeriods(derived.players, allPeriods, p.id);
      const box = (k: string) => Number(p.stats[k] ?? 0);
      assert.equal(line.pts, box('PTS'), `${p.name} PTS`);
      assert.equal(line.ast, box('AST'), `${p.name} AST`);
      assert.equal(line.oreb + line.dreb, box('REB'), `${p.name} REB`);
      assert.equal(line.stl, box('STL'), `${p.name} STL`);
      assert.equal(line.blk, box('BLK'), `${p.name} BLK`);
      assert.equal(line.to, box('TO'), `${p.name} TO`);
      assert.equal(`${line.fgm}-${line.fga}`, p.stats['FG'], `${p.name} FG`);
      assert.equal(`${line.tpm}-${line.tpa}`, p.stats['3PT'], `${p.name} 3PT`);
    }
  }
});

test('team points per period sum to the final score', () => {
  for (const team of [home, away]) {
    assert.equal(sumPeriods(derived.teams, allPeriods, team.team.id).pts, team.score);
  }
});

test('lineups: every group has five players and together they cover regulation', () => {
  for (const team of [home, away]) {
    const groups = sumLineups(derived, null, team.team.id);
    assert.ok(groups.length > 3);
    assert.ok(groups.every((g) => g.ids.length === 5));
    const seconds = groups.reduce((acc, g) => acc + g.sec, 0);
    assert.ok(Math.abs(seconds - 4 * 720) < 30, `${team.team.abbreviation} lineup time ${seconds}`);
  }
});

test('lead changes and largest leads agree with ESPN', () => {
  const flow = deriveFlow(plays, home.team.id, away.team.id);
  const espn = (side: 'home' | 'away', name: string) => {
    const team = fixture.boxscore.teams.find((t: any) => t.homeAway === side);
    return Number(team.statistics.find((s: any) => s.name === name).displayValue);
  };
  assert.equal(flow.leadChanges, espn('home', 'leadChanges'));
  assert.equal(flow.largestHome?.margin ?? 0, espn('home', 'largestLead'));
  assert.equal(flow.largestAway?.margin ?? 0, espn('away', 'largestLead'));
});

const play = (id: number, awayScore: number, homeScore: number) => ({
  id: String(id), period: 1, clockText: '10:00', text: '', typeText: '', homeScore, awayScore,
  scoring: true, scoreValue: 0, shooting: false, pointsAttempted: 0, athleteIds: [],
});

test('flow: unanswered scoring is one run, an answer ends it', () => {
  // home 0-0 -> 6-0 (run), away answers 6-2, away 6-5 (a 3-0 run of its own)
  const seq = [play(1, 0, 2), play(2, 0, 4), play(3, 0, 6), play(4, 2, 6), play(5, 5, 6)];
  const flow = deriveFlow(seq as any, 'H', 'A');
  assert.equal(flow.bestHomeRun?.points, 6);
  assert.equal(flow.bestAwayRun?.points, 5);
  assert.equal(flow.largestHome?.margin, 6);
  assert.equal(flow.leadChanges, 0);
});

test('flow: a lead change is counted when the leader flips, a tie is not', () => {
  const seq = [play(1, 0, 2), play(2, 2, 2), play(3, 4, 2), play(4, 4, 5)];
  const flow = deriveFlow(seq as any, 'H', 'A');
  assert.equal(flow.leadChanges, 2); // home -> away, away -> home (the tie in between doesn't count)
  assert.equal(flow.ties, 1);
});

test('four factors: eFG% weights threes, and the rebound row is dropped without an OREB/DREB split', () => {
  const t = { pts: 0, fgm: 40, fga: 80, tpm: 10, tpa: 30, ftm: 15, fta: 20, reb: 0, oreb: 0, dreb: 0, ast: 0, to: 12, stl: 0, blk: 0, pf: 0 };
  const rows = buildFourFactors(t, t);
  assert.equal(rows[0].awayText, '56.3%'); // (40 + 0.5*10) / 80
  assert.ok(!rows.some((r) => r.label === 'Off. rebound rate'));
  assert.equal(buildFourFactors({ ...t, oreb: 8, dreb: 30 }, { ...t, oreb: 10, dreb: 28 }).length, 4);
});
