/** ESPN scoreboard date key, YYYYMMDD in the device's local time. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** The ESPN scoreboard key (YYYYMMDD, Eastern) a game starting at `d` belongs to. */
export function toNbaDateKey(d: Date): string {
  const { year, month, day } = easternParts(d);
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

/**
 * The day on the device's own calendar (YYYYMMDD) of an evening on an Eastern scoreboard day (YYYYMMDD): 8 pm Eastern by default,
 * which in Spain is already after midnight, so the day after. For marks that know only the Eastern day (the All-Star Game) and not
 * the tip-off time, so they land on the same cell as the game the Day view finds there.
 */
export function easternEveningKey(key: string, hour = 20): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(4, 6));
  const d = Number(key.slice(6, 8));
  // Eastern is UTC-5 or UTC-4: start from the first and correct by what Eastern's clock then says.
  let at = Date.UTC(y, m - 1, d, hour + 5);
  const shown = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }).format(at));
  at += (hour - shown) * 3_600_000;
  return toDateKey(new Date(at));
}

function easternParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** When a game starts in the device's own time, as "Tomorrow · 01:00", or "06.11.2026 · 01:00" further out. */
export function kickoffLabel(iso: string, now: number = Date.now()): string {
  // ESPN sends "2026-11-03T00:30Z", without seconds; not every JS engine reads that.
  const start = new Date(iso.replace(/T(\d\d:\d\d)Z$/, 'T$1:00Z'));
  if (Number.isNaN(start.getTime())) return '';
  const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((dayOf(start) - dayOf(new Date(now))) / 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const day =
    days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days === -1 ? 'Yesterday' : `${pad(start.getDate())}.${pad(start.getMonth() + 1)}.${start.getFullYear()}`;
  return `${day} · ${pad(start.getHours())}:${pad(start.getMinutes())}`;
}

/** Today on the device's own clock, as a local-midnight Date. */
export function localToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** An ESPN timestamp ("2026-11-03T00:30Z", without seconds; not every JS engine reads that) as a Date. */
export function parseEspnDate(iso: string): Date {
  return new Date(iso.replace(/T(\d\d:\d\d)Z$/, 'T$1:00Z'));
}

/** Does a game starting at `iso` start on this day of the device's own calendar? */
export function startsOnDay(iso: string, day: Date): boolean {
  return toDateKey(parseEspnDate(iso)) === toDateKey(day);
}

/**
 * The ESPN scoreboards (keyed by Eastern date) that hold the games starting on a day of the device's own calendar: one or
 * two, since a day in Spain spans Eastern evening of the day before and the afternoon of the day itself.
 */
export function scoreboardKeysFor(day: Date): string[] {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  const keys = [toNbaDateKey(start), toNbaDateKey(new Date(end.getTime() - 1))];
  return keys[0] === keys[1] ? [keys[0]] : keys;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** How long ago an ESPN timestamp was, the way a news list says it: "Just now", "12 min ago", "3 h ago", "Yesterday", then "Nov 7". */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = parseEspnDate(iso);
  if (Number.isNaN(then.getTime())) return '';
  const minutes = Math.floor((now - then.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return 'Yesterday';
  return `${MONTHS[then.getMonth()]} ${then.getDate()}`;
}
