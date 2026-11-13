/**
 * The league's yearly events, for the Events screen (the Cup, the All-Star Weekend, the Draft and the Awards: not the playoffs, which are
 * the season itself and have their own row): which are on right now and in what order to list them. Pure and tested; the months are the usual
 * ones (the Cup runs in November and December, the All-Star Game is in February, the awards come with spring, the Draft is in late June), not a feed: a screen that lists them all is never wrong, only less helpful about the order.
 */

export type EventKey = 'cup' | 'all-star' | 'draft' | 'awards';

/** The order they are listed in when nothing is on: the season's calendar, from the Cup on. */
const EVENT_ORDER: EventKey[] = ['cup', 'all-star', 'draft', 'awards'];

/** The months (0 = January) each is on. */
const MONTHS: Record<EventKey, number[]> = {
  cup: [10, 11],
  'all-star': [0, 1],
  draft: [5, 6],
  awards: [3, 4, 5],
};

/** The events on at this date, in listing order. */
export function eventsOnNow(date: Date = new Date()): EventKey[] {
  return EVENT_ORDER.filter((key) => MONTHS[key].includes(date.getMonth()));
}

/** Every event, those on now first (each group in listing order). */
export function orderEvents(date: Date = new Date()): EventKey[] {
  const on = eventsOnNow(date);
  return [...on, ...EVENT_ORDER.filter((key) => !on.includes(key))];
}
