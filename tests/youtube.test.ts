import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { findGameRecap, MOTION_STATION_ID, parseRecapTitle, parseSearchResults, recapQuery } from '../src/lib/youtube';

// A real YouTube search for "Game Recap: Heat 114, Kings 108 (Nov. 8)" (the night of 8 November 2026), cut down to its video entries.
const videos = parseSearchResults(JSON.parse(readFileSync(new URL('./fixtures/youtube-search.json', import.meta.url), 'utf8')));
const heatKings = { awayName: 'Heat', homeName: 'Kings', awayScore: 114, homeScore: 108, date: '2026-11-09T03:00Z' };

test('youtube: a search gives id, title and channel of every video', () => {
  assert.equal(videos.length, 19);
  assert.ok(videos.every((v) => /^[\w-]{11}$/.test(v.id) && v.title.length > 0));
  const recap = videos.find((v) => v.id === 'a8uStP5KNpk');
  assert.equal(recap?.title, 'Game Recap: Heat 114, Kings 108 (Nov. 8)');
  assert.equal(recap?.channelId, MOTION_STATION_ID);
});

test('youtube: a recap title is taken apart (winner first, the score, the Eastern day)', () => {
  assert.deepEqual(parseRecapTitle('Game Recap: Heat 114, Kings 108 (Nov. 8)'), { winner: 'HEAT', winnerScore: 114, loser: 'KINGS', loserScore: 108, month: 10, day: 8 });
  assert.deepEqual(parseRecapTitle('Game Recap: Trail Blazers 98, 76ers 97 (Jan. 3)'), { winner: 'TRAILBLAZERS', winnerScore: 98, loser: '76ERS', loserScore: 97, month: 0, day: 3 });
  assert.deepEqual(parseRecapTitle('Game Recap: Celtics 101, Bucks 99 (Sept. 30)')?.month, 8);
  // The channel sometimes leaves the loser's score out (the real title of the Lakers-Hawks recap of 9 November 2026).
  assert.deepEqual(parseRecapTitle('Game Recap: Lakers 124, Hawks (Nov. 9)'), { winner: 'LAKERS', winnerScore: 124, loser: 'HAWKS', loserScore: undefined, month: 10, day: 9 });
  assert.equal(parseRecapTitle('Miami Heat vs Sacramento Kings Full Game Highlights - November 8, 2026'), undefined);
});

test('youtube: the recap is searched for by the winner, the score and the loser', () => {
  assert.equal(recapQuery(heatKings), 'Motion Station Game Recap: Heat 114, Kings 108');
  assert.equal(recapQuery({ awayName: 'Nets', homeName: 'Mavericks', awayScore: 93, homeScore: 130 }), 'Motion Station Game Recap: Mavericks 130, Nets 93');
});

test('youtube: the game is found by its two nicknames, its score and its Eastern day, from Motion Station only', () => {
  assert.equal(findGameRecap(videos, heatKings)?.id, 'a8uStP5KNpk');
  // The same words from another channel are not it.
  const reupload = [{ id: 'xxxxxxxxxxx', title: 'Game Recap: Heat 114, Kings 108 (Nov. 8)', channelId: 'UCsomeoneelse' }];
  assert.equal(findGameRecap(reupload, heatKings), undefined);
});

test('youtube: not found for another score, another day or another game', () => {
  assert.equal(findGameRecap(videos, { ...heatKings, homeScore: 109 }), undefined);
  assert.equal(findGameRecap(videos, { ...heatKings, date: '2026-11-11T03:00Z' }), undefined);
  assert.equal(findGameRecap(videos, { awayName: 'Lakers', homeName: 'Warriors', awayScore: 100, homeScore: 90, date: '2026-11-09T03:00Z' }), undefined);
  // With no date to check, teams and score decide.
  assert.equal(findGameRecap(videos, { ...heatKings, date: undefined })?.id, 'a8uStP5KNpk');
});

test('youtube: a recap with no loser score is found by the winner, both teams and the day', () => {
  const lakersHawks = { awayName: 'Lakers', homeName: 'Hawks', awayScore: 124, homeScore: 114, date: '2026-11-10T00:00Z' };
  const recap = [{ id: '5ZULO0F7RvI', title: 'Game Recap: Lakers 124, Hawks (Nov. 9)', channelId: MOTION_STATION_ID }];
  assert.equal(findGameRecap(recap, lakersHawks)?.id, '5ZULO0F7RvI');
  // A different winning score, another day or another opponent is still not it.
  assert.equal(findGameRecap(recap, { ...lakersHawks, awayScore: 125 }), undefined);
  assert.equal(findGameRecap(recap, { ...lakersHawks, date: '2026-11-12T00:00Z' }), undefined);
  assert.equal(findGameRecap(recap, { ...lakersHawks, homeName: 'Pistons' }), undefined);
});
