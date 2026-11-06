import { easternEveningKey, parseEspnDate, toDateKey } from '@/lib/date';
import { allStarGameKey, type CupGame } from '@/lib/espn';
import { parsePlayoffNote } from './bracket';

/** A day the whole league cares about, whichever team you follow. */
export type CalendarEvent = { kind: 'allstar' | 'finals'; label: string };

/**
 * The All-Star Game and the NBA Finals games of a season, by day on the device's own calendar (YYYYMMDD: the day the Calendar's
 * cells and its Day view use, so a Finals game that tips off on the evening of the 13th in New York is marked on the 14th in Spain),
 * for marking on the calendar. The Finals days come from each game's start; the All-Star Game's start is not known, so it is placed
 * at 8 pm Eastern (`easternEveningKey`). `playoffs` are the season's playoff games (their notes say which are Finals games); without them only the
 * All-Star Game is known.
 */
export function calendarEvents(season: number, playoffs: CupGame[] = []): Record<string, CalendarEvent> {
  const events: Record<string, CalendarEvent> = {};
  const allStar = allStarGameKey(season);
  if (allStar) events[easternEveningKey(allStar)] = { kind: 'allstar', label: 'ASG' };
  for (const g of playoffs) {
    const note = parsePlayoffNote(g.stage);
    if (note?.round !== 'finals' || !g.date) continue;
    events[toDateKey(parseEspnDate(g.date))] = { kind: 'finals', label: note.game ? `G${note.game}` : 'FIN' };
  }
  return events;
}
