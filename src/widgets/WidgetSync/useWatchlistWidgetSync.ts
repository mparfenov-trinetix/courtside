import { useEffect } from 'react';

import { useGameSummaries, usePlayerGameLogs, useTeams } from '@/hooks';
import { matchupColors } from '@/lib/theme';
import { useWatchlist } from '@/state';
import { buildWatchlistProps, WATCHLIST_PLAYERS } from '@/lib/widgets';
import { syncWatchlistWidget } from './sync';

/** Keeps the Watchlist widget on your starred games' scores and your starred players' latest lines. */
export function useWatchlistWidgetSync() {
  const { players, games } = useWatchlist();
  const shownPlayers = players.slice(0, WATCHLIST_PLAYERS);
  const logs = usePlayerGameLogs(shownPlayers.map((p) => p.id));
  const summaries = useGameSummaries(games.map((g) => g.id));
  const { data: teams } = useTeams();
  // The two teams' colors, as the Calendar's game cards dress a game.
  const matchupOf = (away: string, home: string) => {
    const a = teams?.find((t) => t.abbreviation === away);
    const h = teams?.find((t) => t.abbreviation === home);
    return a && h ? matchupColors(a, h) : undefined;
  };

  // One signature of what the widget would show, so it is only pushed when that changes.
  const props = buildWatchlistProps(
    shownPlayers,
    Object.fromEntries(shownPlayers.map((p, i) => [p.id, logs[i].data])),
    games,
    Object.fromEntries(games.map((g, i) => [g.id, summaries[i].data])),
    matchupOf,
  );
  const signature = JSON.stringify(props);

  useEffect(() => {
    syncWatchlistWidget(JSON.parse(signature));
  }, [signature]);
}
