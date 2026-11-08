import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { scoreboardQueryFn, useMinuteTick } from '@/hooks';
import { fetchGameSummary } from '@/lib/espn';
import { awaitsTipOff, boardPhase } from '@/lib/game';
import { toNbaDateKey } from '@/lib/date';
import { pickTrackedGame } from '@/lib/widgets';
import { useTeamStore, useWatchlist } from '@/state';
import { syncLiveActivity } from './live-activity';

const BOARD_MS = 30_000;
const GAME_MS = 15_000;

/** Keeps the Dynamic Island / lock screen score on your team's live game (or a starred one). Renders nothing. */
export function useLiveActivity() {
  const favoriteTeamId = useTeamStore((s) => s.favoriteTeamId);
  const { games } = useWatchlist();
  const starred = games.map((g) => g.id);
  const dateKey = toNbaDateKey(new Date());
  // ESPN files a game under the Eastern day it started on, so a game that tipped off in the evening is still on yesterday's
  // board for a while after Eastern midnight (early morning in Europe): look there too, or it is never found.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toNbaDateKey(yesterday);

  const client = useQueryClient();
  const watching = !!favoriteTeamId || starred.length > 0;
  // Looks only while there is something to see: from shortly before tip-off until the last game is over.
  const board = useQuery({
    queryKey: ['scoreboard', dateKey],
    queryFn: scoreboardQueryFn(client, dateKey),
    enabled: watching,
    refetchInterval: (q) => (boardPhase(q.state.data) === 'idle' ? false : BOARD_MS),
  });
  const lastNight = useQuery({
    queryKey: ['scoreboard', yesterdayKey],
    queryFn: scoreboardQueryFn(client, yesterdayKey),
    enabled: watching,
    refetchInterval: (q) => (boardPhase(q.state.data) === 'idle' ? false : BOARD_MS),
  });
  useMinuteTick(awaitsTipOff(board.data));
  const boards = board.data || lastNight.data ? [...(lastNight.data ?? []), ...(board.data ?? [])] : undefined;
  const id = pickTrackedGame(boards, favoriteTeamId, starred);

  const game = useQuery({
    queryKey: ['game', id],
    queryFn: () => fetchGameSummary(id!),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.completed ? false : GAME_MS),
  });

  // Both boards have answered (and at least one with data): "no game to follow" is then true, and any activity left from before can be
  // cleared. Before that (loading, or offline with nothing cached) it is not known, and the activity is left alone.
  const answered = (q: { isSuccess: boolean; isError: boolean }) => q.isSuccess || q.isError;
  const boardsKnown = answered(board) && answered(lastNight) && (board.isSuccess || lastNight.isSuccess);

  useEffect(() => {
    if (id) {
      // The game's own answer is awaited: while it loads there is nothing to say, and saying "null" would clear the activity.
      if (game.data) syncLiveActivity(game.data);
    } else if (boardsKnown) {
      syncLiveActivity(null);
    }
  }, [id, game.data, boardsKnown]);
}
