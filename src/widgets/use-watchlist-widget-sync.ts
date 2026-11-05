import { useEffect } from 'react';

import { useGameSummaries, usePlayerGameLogs } from '@/hooks';
import { useWatchlist } from '@/state';
import { syncWatchlistWidget } from './sync';
import { buildWatchlistProps, WATCHLIST_ROWS } from './snapshots';

/** Keeps the Watchlist widget on your starred games' scores and your starred players' latest lines. */
export function useWatchlistWidgetSync() {
  const { players, games } = useWatchlist();
  const shownPlayers = players.slice(0, WATCHLIST_ROWS);
  const logs = usePlayerGameLogs(shownPlayers.map((p) => p.id));
  const summaries = useGameSummaries(games.map((g) => g.id));

  // One signature of what the widget would show, so it is only pushed when that changes.
  const props = buildWatchlistProps(
    shownPlayers,
    Object.fromEntries(shownPlayers.map((p, i) => [p.id, logs[i].data])),
    games,
    Object.fromEntries(games.map((g, i) => [g.id, summaries[i].data])),
  );
  const signature = JSON.stringify(props);

  useEffect(() => {
    syncWatchlistWidget(JSON.parse(signature));
  }, [signature]);
}
