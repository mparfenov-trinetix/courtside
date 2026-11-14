import assert from 'node:assert/strict';
import { test } from 'node:test';

import { classifyGame as appClassifyGame, cupStage as appCupStage } from '../../src/lib/espn/common.ts';
import { classifyGame, cupStage, easternDateKey, fetchScoreboardDay, normalizeScoreboard, parseTipOff, scoreboardDateKeys } from '../functions/_shared/espn.ts';

/** The parts of ESPN's scoreboard the normalizer reads, with the real field names and shapes (see src/lib/espn/scoreboard.ts). */
const competitor = (homeAway: 'home' | 'away', id: string, abbreviation: string, score: string | undefined, winner = false) => ({
  homeAway,
  winner,
  score,
  team: { id, abbreviation },
});

const event = (id: string, date: string, type: Record<string, unknown>, home: ReturnType<typeof competitor>, away: ReturnType<typeof competitor>, extra: Record<string, unknown> = {}) => ({
  id,
  date,
  season: { type: 2 },
  competitions: [{ status: { type }, competitors: [home, away], ...extra }],
});

const scoreboard = {
  events: [
    event('401', '2026-11-14T00:30Z', { name: 'STATUS_FINAL', state: 'post', completed: true, shortDetail: 'Final' }, competitor('home', '17', 'BKN', '99'), competitor('away', '2', 'BOS', '110', true)),
    event('402', '2026-11-14T03:00Z', { name: 'STATUS_SCHEDULED', state: 'pre', completed: false, shortDetail: '11/13 - 10:00 PM EST' }, competitor('home', '12', 'LAC', undefined), competitor('away', '9', 'GS', undefined)),
    event('403', '2026-11-14T01:00Z', { name: 'STATUS_POSTPONED', state: 'post', completed: false, shortDetail: 'Postponed' }, competitor('home', '25', 'OKC', '0'), competitor('away', '13', 'LAL', '0')),
    event('404', '2026-11-14T02:00Z', { name: 'STATUS_IN_PROGRESS', state: 'in', completed: false, shortDetail: 'Q3 4:12' }, competitor('home', '16', 'MIN', '70'), competitor('away', '7', 'DEN', '65'), {
      notes: [{ headline: 'NBA Cup - Group Play' }],
    }),
    // Things the normalizer must skip rather than guess at.
    { id: '405', date: '2026-11-14T02:00Z', competitions: [{ status: { type: {} }, competitors: [] }] },
    event('406', 'not a date', { name: 'STATUS_SCHEDULED' }, competitor('home', '1', 'ATL', undefined), competitor('away', '3', 'NO', undefined)),
  ],
};

test('a scoreboard becomes game rows with our statuses, scores, winners and kinds', () => {
  const rows = normalizeScoreboard(scoreboard);
  assert.deepEqual(rows.map((r) => r.id), ['401', '402', '403', '404']);

  const [final, scheduled, postponed, live] = rows;
  assert.deepEqual(final, {
    id: '401',
    tipOff: '2026-11-14T00:30:00.000Z',
    awayId: '2',
    awayAbbr: 'BOS',
    homeId: '17',
    homeAbbr: 'BKN',
    status: 'final',
    statusDetail: 'Final',
    awayScore: 110,
    homeScore: 99,
    winnerId: '2',
    kind: 'regular',
  });
  assert.equal(scheduled!.status, 'scheduled');
  assert.equal(scheduled!.awayScore, null);
  assert.equal(scheduled!.homeScore, null);
  assert.equal(scheduled!.winnerId, undefined);
  assert.equal(postponed!.status, 'postponed');
  assert.equal(live!.status, 'in_progress');
  assert.equal(live!.kind, 'cup-group');
});

test('ESPN\'s tip-off, which has no seconds, is read', () => {
  assert.equal(parseTipOff('2026-11-14T00:30Z'), '2026-11-14T00:30:00.000Z');
  assert.equal(parseTipOff('2026-11-14T00:30:15Z'), '2026-11-14T00:30:15.000Z');
  assert.equal(parseTipOff('nonsense'), null);
  assert.equal(parseTipOff(undefined), null);
});

test('the copies of classifyGame and cupStage give the app\'s answers', () => {
  const notes = [
    undefined,
    '',
    'NBA Cup - Group Play',
    'NBA Cup - Quarterfinals',
    'NBA In-Season Tournament Championship',
    'NBA Emirates Cup',
    'NBA All-Star - Round Robin',
    'Rising Stars Game',
    'West Finals - Game 2',
    'East 1st Round - Game 3',
    'NBA Play-In Tournament',
  ];
  for (const note of notes) {
    assert.equal(cupStage(note), appCupStage(note), String(note));
    for (const type of [1, 2, 3, 5, undefined]) assert.equal(classifyGame(note, type), appClassifyGame(note, type), `${String(note)} / ${String(type)}`);
  }
});

test('the Eastern day of an instant, across the clock change', () => {
  // 02:00Z on 1 November 2026 is 22:00 on 31 October in New York (still daylight time); 12:00Z on the 1st is 07:00 EST.
  assert.equal(easternDateKey(new Date('2026-11-01T02:00:00Z')), '20261031');
  assert.equal(easternDateKey(new Date('2026-11-01T12:00:00Z')), '20261101');
  assert.equal(easternDateKey(new Date('2026-11-02T04:30:00Z')), '20261101');
  assert.equal(easternDateKey(new Date('2026-11-02T05:30:00Z')), '20261102');
});

test('the days to read are yesterday to two ahead, Eastern, over month and clock changes', () => {
  assert.deepEqual(scoreboardDateKeys(new Date('2026-11-14T12:00:00Z')), ['20261113', '20261114', '20261115', '20261116']);
  // Evening in New York, already the next day in UTC.
  assert.deepEqual(scoreboardDateKeys(new Date('2026-11-30T02:00:00Z')), ['20261128', '20261129', '20261130', '20261201']);
  // Across the end of daylight time (1 November 2026): no day is skipped or repeated.
  assert.deepEqual(scoreboardDateKeys(new Date('2026-11-01T12:00:00Z')), ['20261031', '20261101', '20261102', '20261103']);
  assert.deepEqual(scoreboardDateKeys(new Date('2026-12-31T20:00:00Z')), ['20261230', '20261231', '20270101', '20270102']);
  assert.deepEqual(scoreboardDateKeys(new Date('2026-11-14T12:00:00Z'), 0, 0), ['20261114']);
});

test('one scoreboard day is read from the app\'s own endpoint, and a failed day throws', async () => {
  const urls: string[] = [];
  const ok = (async (url: string | URL | Request) => {
    urls.push(String(url));
    return new Response(JSON.stringify(scoreboard), { status: 200 });
  }) as typeof fetch;
  const rows = await fetchScoreboardDay('20261114', ok);
  assert.equal(rows.length, 4);
  assert.equal(urls[0], 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261114&limit=20');

  const broken = (async () => new Response('nope', { status: 503 })) as typeof fetch;
  await assert.rejects(() => fetchScoreboardDay('20261114', broken), /503/);
});
