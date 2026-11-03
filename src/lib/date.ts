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
