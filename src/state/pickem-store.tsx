import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { settlePicks, type GamePick } from '@/lib/league';

const KEY = 'courtside:pickem';

/**
 * Your Pick'em calls, one per game, saved on the device. A small external store like the team's, not a context: the Calendar
 * has fifteen game cards a page and each one asks only about its own game, so a pick must wake that card and no other.
 */
let picks: Record<string, GamePick> = {};
let list: GamePick[] = [];
let hydrated = false;
/** The saved picks have been read (or could not be): until then nothing is written, or a pick made at launch would replace the picks on disk. */
let loaded = false;
/** Something changed before the read finished: written once it has. */
let dirty = false;
const listeners = new Set<() => void>();

function commit(next: Record<string, GamePick>) {
  picks = next;
  list = Object.values(next).sort((a, b) => a.date.localeCompare(b.date));
  listeners.forEach((l) => l());
  if (loaded) save();
  else dirty = true;
}

function save() {
  AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
}

/** Reads the saved picks once (a pick made before the read finished is kept). */
export function hydratePicks() {
  if (hydrated) return;
  hydrated = true;
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      const saved = (JSON.parse(raw) as GamePick[]).filter((p) => p && p.id);
      const merged: Record<string, GamePick> = {};
      for (const p of saved) merged[p.id] = p;
      // Whatever was picked meanwhile wins over what was on disk.
      Object.assign(merged, picks);
      picks = merged;
      list = Object.values(merged).sort((a, b) => a.date.localeCompare(b.date));
      listeners.forEach((l) => l());
    })
    .catch(() => {})
    .finally(() => {
      loaded = true;
      if (dirty) save();
      dirty = false;
    });
}

/** Picks a side of a game; the same side again takes the pick back. */
export function setPick(pick: GamePick) {
  const current = picks[pick.id];
  if (current && current.teamId === pick.teamId) {
    const { [pick.id]: _gone, ...rest } = picks;
    commit(rest);
  } else {
    commit({ ...picks, [pick.id]: pick });
  }
}

/** Notes who was favored on a pick made without knowing it (from a list of games, which carries no odds); a favorite already known stays. */
export function setPickFavorite(gameId: string, favoriteId?: string) {
  const current = picks[gameId];
  if (!current || current.favoriteId || !favoriteId) return;
  commit({ ...picks, [gameId]: { ...current, favoriteId } });
}

/** A game moved to another day (postponed): the pick follows it, so it locks at the new tip-off and is looked for on the right board. */
export function setPickDate(gameId: string, date: string) {
  const current = picks[gameId];
  if (!current || current.date === date) return;
  commit({ ...picks, [gameId]: { ...current, date } });
}

/** Records the winners of finished games on the picks that wait for them. */
export function settleStoredPicks(winners: Record<string, string | undefined>) {
  const next = settlePicks(list, winners);
  if (next === list) return;
  const byId: Record<string, GamePick> = {};
  for (const p of next) byId[p.id] = p;
  commit(byId);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Your pick for one game (undefined when you have none); the component hears only about this game. */
export function usePick(gameId?: string | null): GamePick | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (gameId ? picks[gameId] : undefined),
    () => undefined,
  );
}

/** Every pick, oldest game first. */
export function usePicks(): GamePick[] {
  return useSyncExternalStore(
    subscribe,
    () => list,
    () => list,
  );
}
