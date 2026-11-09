import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { AWARDS_FROM, awardAthleteIds, awardSeasons, normalizeSeasonAwards, seasonLabel } from '../src/lib/espn';

// Real award records, trimmed: 2025 (the main awards, three teams of five, the Cup MVP), 1996 and 1980 (names of the early years).
const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/season-awards.json', import.meta.url), 'utf8'));
const season = (year: number) => normalizeSeasonAwards(year, FIXTURE[String(year)].awards, FIXTURE[String(year)].athletes);
const award = (year: number, group: string, name: string) => season(year).groups.find((g) => g.key === group)?.awards.find((a) => a.name === name);

test('awards 2025: the groups found, in the order the screen shows them', () => {
  assert.deepEqual(season(2025).groups.map((g) => g.key), ['major', 'playoffs', 'allnba', 'alldefense', 'allrookie', 'cup']);
  assert.deepEqual(season(2025).groups[0].awards.map((a) => a.name), ['MVP', 'Defensive Player of the Year']);
});

test('awards 2025: an individual award has one winner with his name, photo and team', () => {
  const mvp = award(2025, 'major', 'MVP')!;
  assert.equal(mvp.winners.length, 1);
  assert.equal(mvp.winners[0].name, 'Shai Gilgeous-Alexander');
  assert.equal(mvp.winners[0].id, '4278073');
  assert.equal(mvp.winners[0].teamId, '25');
  assert.match(mvp.winners[0].headshot ?? '', /4278073\.png$/);
  assert.equal(award(2025, 'cup', 'NBA Cup MVP')!.winners[0].name, 'Giannis Antetokounmpo');
  assert.equal(award(2025, 'playoffs', 'Finals MVP')!.winners[0].name, 'Shai Gilgeous-Alexander');
});

test('awards 2025: a team of five is in court order, guards then forwards then the center', () => {
  const first = award(2025, 'allnba', 'First Team')!;
  assert.deepEqual(first.winners.map((w) => w.name), ['Donovan Mitchell', 'Shai Gilgeous-Alexander', 'Giannis Antetokounmpo', 'Jayson Tatum', 'Nikola Jokic']);
  assert.equal(award(2025, 'allnba', 'Third Team')!.winners.length, 5);
  // The second teams were not in the fixture: an award without winners is left out, not shown empty.
  assert.equal(award(2025, 'allnba', 'Second Team'), undefined);
});

test('awards from the early years: names, no position shown for "NA", the old franchise is its current team', () => {
  assert.equal(award(1996, 'major', 'MVP')!.winners[0].name, 'Michael Jordan');
  assert.equal(award(1996, 'major', 'MVP')!.winners[0].teamId, '4');
  assert.equal(award(1996, 'major', 'Defensive Player of the Year')!.winners[0].name, 'Gary Payton');
  const eighty = season(1980);
  assert.deepEqual(eighty.groups.map((g) => g.key), ['major', 'allnba']);
  assert.equal(award(1980, 'major', 'MVP')!.winners[0].name, 'Kareem Abdul-Jabbar');
  assert.ok(award(1980, 'allnba', 'First Team')!.winners.every((w) => w.position === undefined));
  // Awards ESPN did not give yet (Defensive Player of the Year began in 1983) are simply absent.
  assert.equal(award(1980, 'major', 'Defensive Player of the Year'), undefined);
});

test('awards: the athlete records to look up are the winners, once each', () => {
  const ids = awardAthleteIds(FIXTURE['2025'].awards);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('4278073'));
  assert.equal(ids.length, Object.keys(FIXTURE['2025'].athletes).length);
});

test('awards: a season with no records has no groups', () => {
  assert.deepEqual(normalizeSeasonAwards(2030, [], {}).groups, []);
});

test('award seasons: newest first down to 1999-00, the current one only once its spring awards are given', () => {
  // October 2026: the 2026-27 season has begun, the latest awards are 2026's (the 2025-26 season).
  const autumn = awardSeasons(new Date(2026, 10, 9));
  assert.equal(autumn[0], 2026);
  assert.equal(autumn[autumn.length - 1], AWARDS_FROM);
  assert.equal(AWARDS_FROM, 2000);
  // May 2027: that season's awards are being given.
  assert.equal(awardSeasons(new Date(2027, 4, 20))[0], 2027);
  // February: still the season before.
  assert.equal(awardSeasons(new Date(2027, 1, 10))[0], 2026);
  assert.equal(seasonLabel(2026), '2025-26');
  assert.equal(seasonLabel(2000), '1999-00');
});
