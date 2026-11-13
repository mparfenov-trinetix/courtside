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

/** What was saved, merged under what was changed while it was being read (that wins). */
function merge<T extends { id: string }>(saved: T[], meanwhile: T[]): T[] {
  return [...saved.filter((s) => !meanwhile.some((m) => m.id === s.id)), ...meanwhile];
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<WatchedPlayer[]>([]);
  const [games, setGames] = useState<WatchedGame[]>([]);
  // Nothing is written until the saved lists have been read, or a star at launch would replace what is on disk.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(GAMES_KEY)])
      .then(([rawPlayers, rawGames]) => {
        if (rawPlayers) setPlayers((now) => merge(JSON.parse(rawPlayers) as WatchedPlayer[], now));
        if (rawGames) setGames((now) => merge(JSON.parse(rawGames) as WatchedGame[], now));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(players)).catch(() => {});
  }, [loaded, players]);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(GAMES_KEY, JSON.stringify(games)).catch(() => {});
  }, [loaded, games]);

  // Functional updates: two stars in one tick both count.
  const value: WatchlistState = {
    players,
    isWatched: (id) => players.some((p) => p.id === id),
    toggle: (player) => setPlayers((now) => (now.some((p) => p.id === player.id) ? now.filter((p) => p.id !== player.id) : [...now, player])),
    games,
    isGameWatched: (id) => games.some((g) => g.id === id),
    toggleGame: (game) => setGames((now) => (now.some((g) => g.id === game.id) ? now.filter((g) => g.id !== game.id) : [...now, game])),
  };

  return <WatchlistContext value={value}>{children}</WatchlistContext>;
}

export function useWatchlist() {
  const ctx = use(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used inside <WatchlistProvider>');
  return ctx;
}
