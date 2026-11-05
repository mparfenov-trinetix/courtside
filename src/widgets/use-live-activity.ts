import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { scoreboardQueryFn, useMinuteTick } from '@/hooks';
import { fetchGameSummary } from '@/lib/espn';
import { awaitsTipOff, boardPhase } from '@/lib/game';
import { toNbaDateKey } from '@/lib/date';
import { useTeamStore, useWatchlist } from '@/state';
import { pickTrackedGame } from './live-game';
import { syncLiveActivity } from './live-activity';

const BOARD_MS = 30_000;
const GAME_MS = 15_000;

/** Keeps the Dynamic Island / lock screen score on your team's live game (or a starred one). Renders nothing. */
export function useLiveActivity() {
  const favoriteTeamId = useTeamStore((s) => s.favoriteTeamId);
  const { games } = useWatchlist();
  const starred = games.map((g) => g.id);
  const dateKey = toNbaDateKey(new Date());

  const client = useQueryClient();
  const board = useQuery({
    queryKey: ['scoreboard', dateKey],
    queryFn: scoreboardQueryFn(client, dateKey),
    enabled: !!favoriteTeamId || starred.length > 0,
    // Looks only while there is something to see: from shortly before tip-off until the last game is over.
    refetchInterval: (q) => (boardPhase(q.state.data) === 'idle' ? false : BOARD_MS),
  });
  useMinuteTick(awaitsTipOff(board.data));
  const id = pickTrackedGame(board.data, favoriteTeamId, starred);

  const game = useQuery({
    queryKey: ['game', id],
    queryFn: () => fetchGameSummary(id!),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.completed ? false : GAME_MS),
  });

  useEffect(() => {
    syncLiveActivity(id ? (game.data ?? null) : null);
  }, [id, game.data]);
}
