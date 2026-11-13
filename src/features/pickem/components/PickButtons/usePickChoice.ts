import { useQueryClient } from '@tanstack/react-query';

import { fetchGameSummary } from '@/lib/espn';
import { favoriteOf, type GamePick, type PickableGame, type PickSide } from '@/lib/league';
import { setPick, setPickFavorite, usePick } from '@/state';
import { useLocked } from './useLocked';

/**
 * Your call on one game: the pick, whether it is locked (tip-off has passed) and `choose(side)`, which makes the pick (the same side again
 * takes it back). `favoriteId` is who is favored right now, saved with the pick so the score card can say how you did against the favorite;
 * a list of games carries no odds, so then the favorite is read from the game's own summary (the query the game page uses) afterwards.
 */
export function usePickChoice(game: PickableGame, favoriteId?: string) {
  const pick = usePick(game.id);
  const locked = useLocked(game.date);
  const client = useQueryClient();
  const choose = (side: PickSide) => {
    const next: GamePick = { id: game.id, date: game.date, away: game.away, home: game.home, teamId: side.id, madeAt: Date.now(), favoriteId };
    setPick(next);
    if (favoriteId === undefined) {
      client
        .fetchQuery({ queryKey: ['game', game.id], queryFn: () => fetchGameSummary(game.id), staleTime: 2 * 60 * 1000 })
        .then((summary) => setPickFavorite(game.id, favoriteOf(game.away.id, game.home.id, summary.pregame)))
        .catch(() => {});
    }
  };
  return { pick, locked, choose };
}
