import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { normalizeGameSummary } from '../src/lib/espn';
import { shotsOf, timeoutInProgress, buildFourFactors, deriveFlow, deriveQuarterStats, sumLineups, sumPeriods } from '../src/lib/game';

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

test('shotsOf: one player field goals with locations, free throws left out', () => {
  const shooter = plays.find((p) => p.shooting && p.x != null && p.athleteIds[0])!.athleteIds[0];
  const shots = shotsOf(plays, shooter);
  assert.ok(shots.length > 3);
  assert.ok(shots.every((s) => s.x >= 0 && s.x <= 50 && s.y >= 0 && s.y <= 47));
  assert.ok(shots.some((s) => s.made) && shots.some((s) => !s.made));
  assert.deepEqual(shotsOf(plays, 'nobody'), []);
});

test('a timeout is in progress only while it is the newest play of a live game', () => {
  const at = plays.findIndex((p) => /timeout/i.test(p.typeText) && p.teamId);
  assert.ok(at > 0);
  const timeout = plays[at];
  // The feed stops on the timeout: it is on, and belongs to the team that called it.
  assert.deepEqual(timeoutInProgress(plays.slice(0, at + 1), true), { teamId: timeout.teamId });
  // Play resumed (the next play exists), the game ended, or it never started: no timeout.
  assert.equal(timeoutInProgress(plays.slice(0, at + 2), true), null);
  assert.equal(timeoutInProgress(plays.slice(0, at + 1), false), null);
  assert.equal(timeoutInProgress([], true), null);
});

test('a timeout with no team is an official one', () => {
  const official = { ...plays[0], typeText: 'Official Timeout', teamId: undefined };
  assert.deepEqual(timeoutInProgress([official], true), { teamId: undefined });
});

test('a game is polled from shortly before tip-off, not only once it is live', async () => {
  const { gamePhase } = await import('../src/lib/game');
  const now = Date.parse('2026-11-05T00:00:00Z');
  const at = (minutes: number) => new Date(now + minutes * 60_000).toISOString();
  assert.equal(gamePhase({ live: false, completed: false, date: at(120) }, now), 'idle');
  assert.equal(gamePhase({ live: false, completed: false, date: at(15) }, now), 'soon');
  assert.equal(gamePhase({ live: false, completed: false, date: at(-5) }, now), 'soon'); // should have started
  assert.equal(gamePhase({ live: false, completed: false, date: at(-600) }, now), 'idle'); // long gone: postponed
  assert.equal(gamePhase({ live: true, completed: false, date: at(-30) }, now), 'live');
  assert.equal(gamePhase({ live: false, completed: true, date: at(-200) }, now), 'idle');
  assert.equal(gamePhase({ live: false, completed: false, date: '2026-11-05T00:10Z' }, now), 'soon'); // ESPN's no-seconds dates
});

test('a day of games is polled while any is on or about to start, and a waiting day asks to be re-checked', async () => {
  const { boardPhase, awaitsTipOff } = await import('../src/lib/game');
  const now = Date.parse('2026-11-05T00:00:00Z');
  const at = (minutes: number) => new Date(now + minutes * 60_000).toISOString();
  const g = (inProgress: boolean, completed: boolean, minutes: number) => ({ inProgress, completed, date: at(minutes) });
  assert.equal(boardPhase([g(false, true, -200), g(true, false, -60)], now), 'live');
  assert.equal(boardPhase([g(false, true, -200), g(false, false, 10)], now), 'soon');
  assert.equal(boardPhase([g(false, true, -200), g(false, false, 300)], now), 'idle');
  assert.equal(boardPhase(undefined, now), 'idle');
  // Night games hours away: nothing to poll yet, but the page must look at the clock again to notice tip-off.
  assert.equal(awaitsTipOff([g(false, false, 300)]), true);
  assert.equal(awaitsTipOff([g(false, true, -200)]), false);
});
