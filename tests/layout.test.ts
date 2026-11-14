import assert from 'node:assert/strict';
import { test } from 'node:test';

import { COLUMN_MAX, REGULAR_MIN, appWidthOf, gridColumns, gridItemWidth, isRegularWidth, uiScale } from '../src/lib/layout';

test('a phone is drawn exactly as it was', () => {
  for (const w of [320, 375, 393, 430, 599]) {
    assert.equal(appWidthOf(w), w);
    assert.equal(isRegularWidth(w), false);
    assert.equal(uiScale(w), 1);
  }
});

test('an iPad or a Mac window is regular and its sizes grow with the room', () => {
  assert.equal(isRegularWidth(REGULAR_MIN), true);
  assert.equal(uiScale(744), 1.2);
  assert.equal(uiScale(834), 1.2);
  assert.equal(uiScale(1194), 1.35);
  assert.ok(uiScale(1366) >= uiScale(834));
});

test('a window is never cut unless it is absurdly wide', () => {
  assert.equal(appWidthOf(1366), 1366);
  assert.equal(appWidthOf(COLUMN_MAX + 500), COLUMN_MAX);
});

test('columns of a grid', () => {
  // 380 wide at least, 8 apart, inside 834 - 32 of page padding.
  assert.equal(gridColumns(834 - 32, 380, 8), 2);
  assert.equal(gridColumns(393 - 32, 380, 8), 1);
  assert.equal(gridColumns(1194 - 32, 380, 8), 3);
  assert.equal(gridItemWidth(802, 2, 8), 397);
  assert.equal(gridItemWidth(361, 1, 8), 361);
});
