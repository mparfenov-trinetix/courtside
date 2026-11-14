import assert from 'node:assert/strict';
import { test } from 'node:test';

import { COLUMN_MAX, REGULAR_MIN, appWidthOf, isRegularWidth, uiScale } from '../src/lib/layout';

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
