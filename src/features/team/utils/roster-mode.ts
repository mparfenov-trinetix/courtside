import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RosterMode } from '../constants';

const KEY = 'courtside:rosterView';
const MODES: RosterMode[] = ['list', 'cards', 'insights'];

/** The Teams view last chosen, kept in memory once known (the pager is rebuilt when the team being viewed changes: it must not fall back to the list). */
let remembered: RosterMode | null = null;

export const rememberedRosterMode = (): RosterMode | null => remembered;

/** Reads the saved view once; resolves null when none was saved or the disk could not be read. */
export async function loadRosterMode(): Promise<RosterMode | null> {
  if (remembered) return remembered;
  try {
    const saved = await AsyncStorage.getItem(KEY);
    const found = MODES.find((m) => m === saved) ?? null;
    if (found && !remembered) remembered = found;
    return found;
  } catch {
    return null;
  }
}

export function saveRosterMode(mode: RosterMode) {
  remembered = mode;
  AsyncStorage.setItem(KEY, mode).catch(() => {});
}
