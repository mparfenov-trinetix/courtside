import assert from 'node:assert/strict';
import { test } from 'node:test';

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
