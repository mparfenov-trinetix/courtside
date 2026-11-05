import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

const KEY = 'courtside:watchlist';
const GAMES_KEY = 'courtside:watchlist-games';

export type WatchedPlayer = { id: string; name: string; teamId: string };

/** A starred game, with enough of it saved to list it before (or without) loading the game itself. */
export type WatchedGame = {
  id: string;
  /** ISO start time. */
  date: string;
  away: { id: string; abbr: string; logo: string };
  home: { id: string; abbr: string; logo: string };
};

type WatchlistState = {
  players: WatchedPlayer[];
  isWatched: (id: string) => boolean;
  toggle: (player: WatchedPlayer) => void;
  games: WatchedGame[];
  isGameWatched: (id: string) => boolean;
  toggleGame: (game: WatchedGame) => void;
};

const WatchlistContext = createContext<WatchlistState | null>(null);

function load<T>(key: string, set: (value: T[]) => void) {
  AsyncStorage.getItem(key)
    .then((raw) => {
      if (raw) set(JSON.parse(raw) as T[]);
    })
    .catch(() => {});
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<WatchedPlayer[]>([]);
  const [games, setGames] = useState<WatchedGame[]>([]);

  useEffect(() => {
    load<WatchedPlayer>(KEY, setPlayers);
    load<WatchedGame>(GAMES_KEY, setGames);
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
    games,
    isGameWatched: (id) => games.some((g) => g.id === id),
    toggleGame: (game) => {
      const next = games.some((g) => g.id === game.id) ? games.filter((g) => g.id !== game.id) : [...games, game];
      setGames(next);
      AsyncStorage.setItem(GAMES_KEY, JSON.stringify(next)).catch(() => {});
    },
  };

  return <WatchlistContext value={value}>{children}</WatchlistContext>;
}

export function useWatchlist() {
  const ctx = use(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used inside <WatchlistProvider>');
  return ctx;
}
