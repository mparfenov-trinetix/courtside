/** ESPN scoreboard date key, YYYYMMDD in the device's local time. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Today's date on ESPN's clock (US Eastern), as a local-midnight Date. Scoreboards are keyed by
 * Eastern date, so for someone in Europe a late game belongs to "yesterday" until the early morning.
 */
export function nbaToday(): Date {
  const { year, month, day } = easternParts(new Date());
  return new Date(year, month - 1, day);
}

/** The ESPN scoreboard key (YYYYMMDD, Eastern) a game starting at `d` belongs to. */
export function toNbaDateKey(d: Date): string {
  const { year, month, day } = easternParts(d);
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
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
