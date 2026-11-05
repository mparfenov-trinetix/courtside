import { toNbaDateKey } from '@/lib/date';
import { allStarGameKey, type CupGame } from '@/lib/espn';
import { parsePlayoffNote } from './bracket';

/** A day the whole league cares about, whichever team you follow. */
export type CalendarEvent = { kind: 'allstar' | 'finals'; label: string };

/**
 * The All-Star Game and the NBA Finals games of a season, by scoreboard day (YYYYMMDD, US Eastern), for marking on the
 * calendar. `playoffs` are the season's playoff games (their notes say which are Finals games); without them only the
 * All-Star Game is known.
 */
export function calendarEvents(season: number, playoffs: CupGame[] = []): Record<string, CalendarEvent> {
  const events: Record<string, CalendarEvent> = {};
  const allStar = allStarGameKey(season);
  if (allStar) events[allStar] = { kind: 'allstar', label: 'ASG' };
  for (const g of playoffs) {
    const note = parsePlayoffNote(g.stage);
    if (note?.round !== 'finals' || !g.date) continue;
    events[toNbaDateKey(new Date(g.date))] = { kind: 'finals', label: note.game ? `G${note.game}` : 'FIN' };
  }
  return events;
}
