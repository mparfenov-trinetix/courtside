import assert from 'node:assert/strict';
import { test } from 'node:test';

import { allStarGameKey } from '../src/lib/espn';
import { CHAMPIONS, CUP_CHAMPIONS } from '../src/lib/league';

// Tables kept by hand each year: this fails the day one of them has fallen behind the calendar, so the update is not forgotten.
const now = new Date();
const year = now.getFullYear();
const month = now.getMonth(); // 0 = January

/** The newest season whose Finals are over (they end in June). */
const lastFinished = month >= 6 ? year : year - 1;

test('the champions table has the latest finished season', () => {
  assert.ok(CHAMPIONS[lastFinished], `add the ${lastFinished} champion to CHAMPIONS in lib/league/titles.ts`);
});

test('the Cup winners table has the latest finished Cup', () => {
  // The Cup final is played in December, so the season ending in this year was decided last December (December itself is left alone: the final may not be played yet).
  assert.ok(CUP_CHAMPIONS[year], `add the ${year} Cup winner to CUP_CHAMPIONS in lib/league/titles.ts`);
});

test('the All-Star table has the latest All-Star Game', () => {
  // The game is played in February, so season Y has one once March of Y has come.
  const allStarSeason = month >= 2 ? year : year - 1;
  assert.ok(allStarGameKey(allStarSeason), `add the ${allStarSeason} All-Star game day to GAME_DAYS in lib/espn/all-star.ts`);
});
