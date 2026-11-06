import { createContext, useContext, type ReactNode } from 'react';

const NONE: readonly string[] = [];
const SpotlightContext = createContext<readonly string[]>(NONE);

/**
 * Teams a screen was opened for (the two sides of the game you came from): the bracket and the Cup tables light them up and open
 * where they are. A context, so the cards deep in a bracket do not each need the list passed down.
 */
export function Spotlight({ teams, children }: { teams: readonly string[]; children: ReactNode }) {
  return <SpotlightContext.Provider value={teams}>{children}</SpotlightContext.Provider>;
}

/** Whether a team is in the spotlight. */
export function useSpotlight(): (teamId: string) => boolean {
  const teams = useContext(SpotlightContext);
  return (teamId) => teams.includes(teamId);
}

/** Whether any team is in the spotlight. */
export function useHasSpotlight(): boolean {
  return useContext(SpotlightContext).length > 0;
}
