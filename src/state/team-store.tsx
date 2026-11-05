import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';

const FAVORITE_KEY = 'courtside:favoriteTeamId';

type TeamData = {
  /** Has the stored favorite been read from disk yet? */
  hydrated: boolean;
  favoriteTeamId: string | null;
  /** The team shown on the home card. Defaults to the favorite. */
  currentTeamId: string | null;
};

type TeamActions = {
  setFavorite: (teamId: string) => void;
  viewTeam: (teamId: string) => void;
  clearFavorite: () => void;
};

export type TeamState = TeamData & TeamActions;

// A tiny external store rather than a context: a context re-renders every consumer whenever any part of it changes, and
// the drawer keeps a dozen screens mounted, so choosing another team used to re-render all of them. With a selector a
// component hears only about the part it reads.
let data: TeamData = { hydrated: false, favoriteTeamId: null, currentTeamId: null };
const listeners = new Set<() => void>();

function set(patch: Partial<TeamData>) {
  data = { ...data, ...patch };
  snapshot = { ...data, ...actions };
  listeners.forEach((l) => l());
}

const actions: TeamActions = {
  setFavorite: (teamId) => {
    set({ favoriteTeamId: teamId, currentTeamId: teamId });
    AsyncStorage.setItem(FAVORITE_KEY, teamId).catch(() => {});
  },
  viewTeam: (teamId) => set({ currentTeamId: teamId }),
  clearFavorite: () => {
    set({ favoriteTeamId: null, currentTeamId: null });
    AsyncStorage.removeItem(FAVORITE_KEY).catch(() => {});
  },
};

let snapshot: TeamState = { ...data, ...actions };

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Reads the stored favorite once, at the root. */
export function TeamProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    AsyncStorage.getItem(FAVORITE_KEY)
      .then((id) => set({ favoriteTeamId: id, currentTeamId: id }))
      .catch(() => {})
      .finally(() => set({ hydrated: true }));
  }, []);
  return children;
}

/**
 * The team state. With a selector (`useTeamStore((s) => s.favoriteTeamId)`) the component re-renders only when that
 * value changes; without one it gets everything, and re-renders on any change.
 */
export function useTeamStore(): TeamState;
export function useTeamStore<T>(selector: (state: TeamState) => T): T;
export function useTeamStore<T>(selector?: (state: TeamState) => T) {
  return useSyncExternalStore(
    subscribe,
    () => (selector ? selector(snapshot) : snapshot),
    () => (selector ? selector(snapshot) : snapshot),
  );
}
