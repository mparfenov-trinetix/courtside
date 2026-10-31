import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

const FAVORITE_KEY = 'courtside:favoriteTeamId';

type TeamState = {
  /** Has the stored favorite been read from disk yet? */
  hydrated: boolean;
  favoriteTeamId: string | null;
  /** The team shown on the home card. Defaults to the favorite. */
  currentTeamId: string | null;
  setFavorite: (teamId: string) => void;
  viewTeam: (teamId: string) => void;
  clearFavorite: () => void;
};

const TeamContext = createContext<TeamState | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITE_KEY)
      .then((id) => {
        setFavoriteTeamId(id);
        setCurrentTeamId(id);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const value: TeamState = {
    hydrated,
    favoriteTeamId,
    currentTeamId,
    setFavorite: (teamId) => {
      setFavoriteTeamId(teamId);
      setCurrentTeamId(teamId);
      AsyncStorage.setItem(FAVORITE_KEY, teamId).catch(() => {});
    },
    viewTeam: (teamId) => setCurrentTeamId(teamId),
    clearFavorite: () => {
      setFavoriteTeamId(null);
      setCurrentTeamId(null);
      AsyncStorage.removeItem(FAVORITE_KEY).catch(() => {});
    },
  };

  return <TeamContext value={value}>{children}</TeamContext>;
}

export function useTeamStore() {
  const ctx = use(TeamContext);
  if (!ctx) throw new Error('useTeamStore must be used inside <TeamProvider>');
  return ctx;
}
