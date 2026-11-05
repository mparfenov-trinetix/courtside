import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildFixturesProps, buildFormProps, streakOf } from '../src/widgets/snapshots.ts';
import { buildTimeline } from '../src/widgets/timeline.ts';

const team = { abbreviation: 'PHI', name: '76ers', logo: 'light.png', logoDark: 'dark.png' };
const theme = { background: '#06121F', surface: '#0B2A47', accent: '#2E9BEA' };
const NOW = new Date('2026-11-03T12:00:00Z');
const game = (id: string, iso: string, opp: string, home: boolean, completed = false, cup?: string) => ({
  id, date: iso, home, opponent: `${opp} Team`, opponentAbbr: opp, opponentLogo: `${opp}.png`, opponentId: id, completed, cup,
});

test('timeline: only unplayed games, soonest first, the first one shown now', () => {
  const t = buildTimeline(team, { record: '4-3' }, [
    game('3', '2026-11-09T01:00:00Z', 'CHI', true),
    game('1', '2026-11-01T01:00:00Z', 'NY', true, true),
    game('2', '2026-11-05T01:00:00Z', 'DET', false, false, 'Group Play'),
  ], theme, NOW);
  assert.deepEqual([...new Set(t.map((e) => e.props.oppAbbr))], ['DET', 'CHI']);
  assert.equal(t[0].date, NOW);
  assert.equal(t[0].props.live, false);
  assert.equal(t[0].props.tag, 'NBA Cup');
  assert.equal(t[0].props.home, false);
  assert.equal(t[0].props.record, '4-3');
});

test('timeline: the next game takes over 3 hours after the previous tip-off', () => {
  const t = buildTimeline(team, undefined, [game('a', '2026-11-05T01:00:00Z', 'DET', true), game('b', '2026-11-07T01:00:00Z', 'CLE', true)], theme, NOW);
  const second = t.filter((e) => e.props.oppAbbr === 'CLE');
  assert.equal(second[0].date.toISOString(), '2026-11-05T04:00:00.000Z');
});

test('timeline: a game that has just tipped off still counts until it should be over', () => {
  const t = buildTimeline(team, undefined, [game('a', '2026-11-03T10:30:00Z', 'DET', true)], theme, NOW);
  assert.equal(t[0].props.oppAbbr, 'DET');
  assert.equal(t[0].props.live, true);
});

test('timeline: a game is "next" until tip-off and "live" from tip-off for three hours', () => {
  const t = buildTimeline(team, undefined, [game('a', '2026-11-05T01:00:00Z', 'DET', true)], theme, NOW);
  assert.deepEqual(t.map((e) => [e.date.toISOString(), e.props.live]), [
    ['2026-11-03T12:00:00.000Z', false],
    ['2026-11-05T01:00:00.000Z', true],
  ]);
});

test('timeline: no games left gives a single "nothing scheduled" entry', () => {
  const t = buildTimeline(team, undefined, [game('a', '2026-10-30T01:00:00Z', 'NY', true, true)], theme, NOW);
  assert.equal(t.length, 1);
  assert.equal(t[0].props.iso, '');
});

test('timeline: at most five games are scheduled', () => {
  const many = Array.from({ length: 10 }, (_, i) => game(String(i), `2026-11-${String(10 + i).padStart(2, '0')}T01:00:00Z`, 'X', true));
  assert.equal(new Set(buildTimeline(team, undefined, many, theme, NOW).map((e) => e.props.gameId)).size, 5);
});

test('timeline: carries the dark logos, the opponent logo and a short day label', () => {
  const t = buildTimeline(team, undefined, [game('a', '2026-11-05T01:00:00Z', 'DET', true)], theme, NOW);
  assert.equal(t[0].props.logo, 'dark.png');
  assert.equal(t[0].props.oppLogo, 'DET.png');
  assert.equal(t[0].props.accent, '#2E9BEA');
  assert.match(t[0].props.day, /\w/);
});

const played = (id: string, iso: string, opp: string, result: 'W' | 'L', mine: number, theirs: number, home = true) => ({
  ...game(id, iso, opp, home, true), result, teamScore: mine, opponentScore: theirs,
});

test('form widget: last five finished games oldest first, with record, streak and scores', () => {
  const schedule = [
    played('1', '2026-10-25T01:00:00Z', 'A', 'L', 90, 100),
    played('2', '2026-10-27T01:00:00Z', 'B', 'W', 110, 100),
    played('3', '2026-10-29T01:00:00Z', 'C', 'W', 105, 99),
    played('4', '2026-10-31T01:00:00Z', 'D', 'L', 99, 101, false),
    played('5', '2026-11-01T01:00:00Z', 'E', 'W', 120, 90),
    played('6', '2026-11-02T01:00:00Z', 'F', 'W', 111, 100),
    game('7', '2026-11-05T01:00:00Z', 'G', true),
  ];
  const f = buildFormProps(team, { record: '4-2', standing: '2nd in Atlantic Division' }, schedule, theme);
  assert.deepEqual(f.games.map((g) => g.opp), ['B', 'C', 'D', 'E', 'F']);
  assert.deepEqual(f.games.map((g) => g.result), ['W', 'W', 'L', 'W', 'W']);
  assert.equal(f.games[2].score, '99-101');
  assert.equal(f.games[2].home, false);
  assert.equal(f.streak, 'W2');
  assert.equal(f.record, '4-2');
  assert.equal(f.standing, '2nd in Atlantic Division');
});

test('form widget: no games yet is an empty list, not an error', () => {
  const f = buildFormProps(team, undefined, [game('1', '2026-11-05T01:00:00Z', 'A', true)], theme);
  assert.deepEqual(f.games, []);
  assert.equal(f.streak, '');
});

test('streak counts from the newest result', () => {
  assert.equal(streakOf(['L', 'L', 'W', 'L']), 'L2');
  assert.equal(streakOf(['W']), 'W1');
  assert.equal(streakOf([]), '');
});

test('fixtures widget: unplayed games only, soonest first, capped at five', () => {
  const schedule = [
    played('0', '2026-11-01T01:00:00Z', 'Z', 'W', 100, 90),
    ...['2026-11-12', '2026-11-06', '2026-11-08', '2026-11-10', '2026-11-14', '2026-11-16'].map((d, i) => game(String(i + 1), `${d}T01:00:00Z`, `T${i}`, i % 2 === 0)),
  ];
  const f = buildFixturesProps(team, schedule, theme, NOW);
  assert.equal(f.games.length, 5);
  assert.deepEqual(f.games.map((g) => g.oppAbbr), ['T1', 'T2', 'T3', 'T0', 'T4']);
  assert.equal(f.games[0].gameId, '2');
});

test('live activity props: scores, status, who leads, and a timeout in progress', async () => {
  const { readFileSync } = await import('node:fs');
  const { normalizeGameSummary } = await import('../src/lib/espn/index.ts');
  const { buildLiveGameProps } = await import('../src/widgets/live-game.ts');
  const final = normalizeGameSummary(JSON.parse(readFileSync(new URL('./fixtures/game-final.json', import.meta.url), 'utf8')), '401909912');
  const done = buildLiveGameProps(final, { [final.away.team.logoDark || final.away.team.logo]: 'file:///away.png' });
  assert.equal(done.final, true);
  assert.equal(done.status, 'Final');
  assert.equal(done.awayScore, String(final.away.score));
  assert.equal(done.awayLogo, 'file:///away.png');
  assert.equal(done.homeLogo, '');
  assert.equal(done.awayLeads, final.away.score > final.home.score);
  assert.equal(done.awayLeads && done.homeLeads, false);
  assert.equal(done.timeout, '');
  assert.equal(done.awayBonus || done.homeBonus, false); // a finished game shows no bonus
  assert.match(done.awayBg, /^#[0-9a-f]{6}$/i);

  // A live game stopped on a timeout: the label names the team that called it.
  const at = final.plays.findIndex((p) => /timeout/i.test(p.typeText) && p.teamId);
  const live = { ...final, completed: false, live: true, status: '9:17 - 1st', plays: final.plays.slice(0, at + 1) };
  const onTimeout = buildLiveGameProps(live);
  assert.match(onTimeout.timeout, /^[A-Z]+ TO$/);
  assert.equal(onTimeout.status, '9:17 - 1st');
  assert.equal(onTimeout.final, false);
});

test('live activity follows your team while it is on, else a starred game, else a final from today', async () => {
  const { pickTrackedGame } = await import('../src/widgets/live-game.ts');
  const side = (teamId: string) => ({ teamId, name: '', abbreviation: '', logo: '' });
  const g = (id: string, a: string, h: string, inProgress: boolean, completed = false) =>
    ({ id, date: '', status: '', completed, inProgress, away: side(a), home: side(h) });
  const board = [g('1', '10', '11', true), g('2', '20', '21', true), g('3', '30', '31', false, true)];
  assert.equal(pickTrackedGame(board, '21', ['1']), '2'); // my team's game beats a starred one
  assert.equal(pickTrackedGame(board, '99', ['1']), '1'); // not playing: a starred live game
  assert.equal(pickTrackedGame(board, '99', ['3']), '3'); // only a finished one: put its final up
  assert.equal(pickTrackedGame(board, '99', []), null);
  assert.equal(pickTrackedGame(undefined, '21', []), null);
  assert.equal(pickTrackedGame([g('4', '40', '41', false)], '41', []), null); // not started yet
});
