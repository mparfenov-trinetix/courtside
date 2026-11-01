import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

const KEY = 'courtside:watchlist';

export type WatchedPlayer = { id: string; name: string; teamId: string };

type WatchlistState = {
  players: WatchedPlayer[];
  isWatched: (id: string) => boolean;
  toggle: (player: WatchedPlayer) => void;
};

const WatchlistContext = createContext<WatchlistState | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<WatchedPlayer[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setPlayers(JSON.parse(raw) as WatchedPlayer[]);
      })
      .catch(() => {});
  }, []);

  const value: WatchlistState = {
    players,
    isWatched: (id) => players.some((p) => p.id === id),
    toggle: (player) => {
      const next = players.some((p) => p.id === player.id)
        ? players.filter((p) => p.id !== player.id)
        : [...players, player];
      setPlayers(next);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
    },
  };

  return <WatchlistContext value={value}>{children}</WatchlistContext>;
}

export function useWatchlist() {
  const ctx = use(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used inside <WatchlistProvider>');
  return ctx;
}
