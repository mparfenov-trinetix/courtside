import { useEffect, useState } from 'react';

import { parseEspnDate } from '@/lib/date';
import { isLocked } from '@/lib/league';

/** The longest a timer can wait (a 32-bit number of milliseconds). */
const MAX_WAIT = 2 ** 31 - 1;

/** Is the pick closed (the game has started)? Flips by itself at tip-off, with one timer and no polling. */
export function useLocked(iso: string): boolean {
  const [now, setNow] = useState(() => Date.now());
  const locked = isLocked(iso, now);
  useEffect(() => {
    if (locked) return;
    const wait = Math.min(parseEspnDate(iso).getTime() - Date.now(), MAX_WAIT);
    const id = setTimeout(() => setNow(Date.now()), Math.max(wait, 0) + 50);
    return () => clearTimeout(id);
  }, [iso, locked, now]);
  return locked;
}
