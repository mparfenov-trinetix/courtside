import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from 'expo-router';
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
      // A team chosen while the saved one was being read is not taken back.
      .then((id) => (data.favoriteTeamId == null ? set({ favoriteTeamId: id, currentTeamId: id }) : undefined))
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

const noSubscription = () => () => {};

/**
 * `useTeamStore` for a screen. The drawer keeps every screen it has opened mounted, so with `useTeamStore` a team change re-rendered
 * all of them at once (and each one's queries switched to the new team and fetched), on top of the screen that was trying to close.
 * This one listens only while its screen is on top: the others sit still and catch up (one render, with the new team) the moment
 * they come into view. A screen that re-renders for another reason meanwhile just reads the new value a little early.
 */
export function useScreenTeamStore(): TeamState;
export function useScreenTeamStore<T>(selector: (state: TeamState) => T): T;
export function useScreenTeamStore<T>(selector?: (state: TeamState) => T) {
  const focused = useIsFocused();
  const read = () => (selector ? selector(snapshot) : snapshot);
  return useSyncExternalStore(focused ? subscribe : noSubscription, read, read);
}
