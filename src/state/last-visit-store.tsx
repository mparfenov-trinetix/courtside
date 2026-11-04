import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

const KEY = 'courtside:lastVisit';

/** What was true when the app was last left: when, and where the favorite team stood. */
export type Visit = { at: number; teamId?: string; seed?: number };

type LastVisitState = {
  /** The visit before this one (null on the very first launch or before it has been read). */
  previous: Visit | null;
  /** When this session began. */
  sessionStart: number;
  /** The card was dismissed for this session. */
  dismissed: boolean;
  dismiss: () => void;
  /** Tell the store where the favorite team stands now, so the next visit can say what moved. */
  remember: (teamId: string, seed: number) => void;
};

const LastVisitContext = createContext<LastVisitState | null>(null);

/**
 * Remembers when the app was last used. `previous` is fixed for the whole session (what you missed since then);
 * the stored value is moved forward whenever the app goes to the background.
 */
export function LastVisitProvider({ children }: { children: ReactNode }) {
  const [previous, setPrevious] = useState<Visit | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // When this session began; the same value all session long.
  const [sessionStart] = useState(() => Date.now());
  const current = useRef<Visit>({ at: 0 });

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const stored = JSON.parse(raw) as Visit;
          setPrevious(stored);
          // Carry the old snapshot forward until a fresh one is reported.
          current.current = { ...stored, at: 0 };
        }
      })
      .catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        current.current = { ...current.current, at: Date.now() };
        AsyncStorage.setItem(KEY, JSON.stringify(current.current)).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  const value: LastVisitState = {
    previous,
    sessionStart,
    dismissed,
    dismiss: () => setDismissed(true),
    remember: (teamId, seed) => {
      current.current = { ...current.current, teamId, seed };
    },
  };
  return <LastVisitContext value={value}>{children}</LastVisitContext>;
}

export function useLastVisit() {
  const ctx = use(LastVisitContext);
  if (!ctx) throw new Error('useLastVisit must be used inside <LastVisitProvider>');
  return ctx;
}
