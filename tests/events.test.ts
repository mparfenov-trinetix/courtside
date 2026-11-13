import assert from 'node:assert/strict';
import test from 'node:test';

import { eventsOnNow, orderEvents } from '../src/lib/league';

const at = (month: number) => new Date(2026, month, 15);

test('in November and December the Cup is on, and it comes first', () => {
  assert.deepEqual(eventsOnNow(at(10)), ['cup']);
  assert.deepEqual(orderEvents(at(11)), ['cup', 'all-star', 'draft', 'awards']);
});

test('in February it is the All-Star Weekend, and it comes first; nothing is on in September', () => {
  assert.deepEqual(eventsOnNow(at(1)), ['all-star']);
  assert.deepEqual(orderEvents(at(1)), ['all-star', 'cup', 'draft', 'awards']);
  assert.deepEqual(eventsOnNow(at(8)), []);
  // Nothing on: the usual order.
  assert.deepEqual(orderEvents(at(8)), ['cup', 'all-star', 'draft', 'awards']);
});

test('in June the Draft and the awards are both on, in the usual order, and the others follow; in April only the awards, in July only the Draft', () => {
  assert.deepEqual(eventsOnNow(at(5)), ['draft', 'awards']);
  assert.deepEqual(orderEvents(at(5)), ['draft', 'awards', 'cup', 'all-star']);
  assert.deepEqual(eventsOnNow(at(3)), ['awards']);
  assert.deepEqual(eventsOnNow(at(6)), ['draft']);
});
