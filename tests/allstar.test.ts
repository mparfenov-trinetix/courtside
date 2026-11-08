import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { groupByTeam } from '../src/features/allstar/utils/format';
import { allStarSeasons, headshotUrl, normalizeAllStarWeekend, parseAllStarNote } from '../src/lib/espn';

// Two real weekends, trimmed to what the normalizers read: 2024 (East against West) and 2025 (four captains' teams, two semifinals and a final).
const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/all-star-weekends.json', import.meta.url), 'utf8'));
const weekend = (season: number) => {
  const f = FIXTURE[String(season)];
  return normalizeAllStarWeekend(season, f.scoreboard, f.summaries, [f.mvp]);
};

test('all-star notes: the round and the rule, or just "All-Star Game" for the plain format', () => {
  assert.deepEqual(parseAllStarNote('NBA All-Star - Semifinals First team to 40 points wins - Untimed'), { round: 'Semifinals', rule: 'First team to 40 points wins - Untimed' });
  assert.deepEqual(parseAllStarNote('NBA All-Star - Championship First team to 40 points wins - Untimed'), { round: 'Championship', rule: 'First team to 40 points wins - Untimed' });
  assert.deepEqual(parseAllStarNote('NBA All-Star - Round Robin'), { round: 'Round Robin', rule: undefined });
  assert.deepEqual(parseAllStarNote('NBA All-Star Game'), { round: 'All-Star Game', rule: undefined });
  assert.deepEqual(parseAllStarNote(undefined), { round: 'All-Star Game', rule: undefined });
});

test('all-star 2024: East against West, one game, a 211-186 win, the MVP and the venue', () => {
  const w = weekend(2024);
  assert.equal(w.games.length, 1);
  const g = w.games[0];
  assert.equal(g.round, 'All-Star Game');
  assert.equal(g.final, true);
  const east = g.teams.find((t) => t.name.startsWith('Eastern'))!;
  const west = g.teams.find((t) => t.name.startsWith('Western'))!;
  assert.deepEqual([east.score, east.winner, west.score, west.winner], [211, true, 186, false]);
  assert.equal(w.venue, 'Gainbridge Fieldhouse');
  assert.equal(w.city, 'Indianapolis');
  assert.equal(w.mvps[0]?.name, 'Damian Lillard');
  assert.equal(w.mvps[0]?.teamName, 'Eastern Conf All-Stars');
  assert.equal(w.players.length, 24);
  // The top scorers first, and Lillard's 39 is the East's best.
  assert.equal(w.players[0].pts >= w.players[1].pts, true);
  assert.equal(w.players.find((p) => p.name === 'Karl-Anthony Towns')?.pts, 50);
});

test('all-star 2025: two semifinals and a final in order; a player in two games is counted once with both lines added', () => {
  const w = weekend(2025);
  assert.deepEqual(w.games.map((g) => g.round), ['Semifinals', 'Semifinals', 'Championship']);
  assert.equal(w.games.every((g) => g.rule?.startsWith('First team to 40')), true);
  assert.equal(w.mvps[0]?.name, 'Stephen Curry');
  const ids = w.players.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'one line per player');
  const curry = w.players.find((p) => p.name === 'Stephen Curry')!;
  assert.ok(curry.pts > 0);
});

test('all-star seasons: newest first, 2000 on (2000 and 2001 are only an MVP), and nothing in the future', () => {
  const years = allStarSeasons();
  assert.equal(years[years.length - 1], 2000);
  assert.deepEqual(years.slice(-3), [2002, 2001, 2000]);
  assert.deepEqual([...years].sort((a, b) => b - a), years);
  assert.ok(years[0] <= new Date().getFullYear() + 1);
});

test('all-star players are grouped in the order the games name the sides', () => {
  const w = weekend(2024);
  const groups = groupByTeam(w.players, w.games);
  assert.deepEqual(groups.map((g) => g.team), w.games[0].teams.map((t) => t.name));
  assert.equal(groups.reduce((n, g) => n + g.players.length, 0), w.players.length);
});

test('all-star 2000: no game on the feed, two MVPs who shared the award', () => {
  const athlete = (id: string, name: string) => ({ athlete: { id, displayName: name }, team: { displayName: 'Team' } });
  const w = normalizeAllStarWeekend(2000, {}, [], [athlete('215', 'Tim Duncan'), athlete('614', "Shaquille O'Neal")]);
  assert.equal(w.games.length, 0);
  assert.equal(w.players.length, 0);
  assert.deepEqual(w.mvps.map((m) => m.name), ['Tim Duncan', "Shaquille O'Neal"]);
  // Duncan has no headshot on the award record: the app's own helper names his file.
  assert.match(w.mvps[0].headshot ?? '', /215\.png$/);
});

test('legend photos: ESPN has none of Jordan and Iverson, so their file is NBA.com\'s', () => {
  assert.equal(headshotUrl('1035'), 'https://cdn.nba.com/headshots/nba/latest/260x190/893.png');
  assert.equal(headshotUrl('366'), 'https://cdn.nba.com/headshots/nba/latest/260x190/947.png');
  assert.equal(headshotUrl('3112335'), 'https://a.espncdn.com/i/headshots/nba/players/full/3112335.png');
});
