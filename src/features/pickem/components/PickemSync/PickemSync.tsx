import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { scoreboardQueryFn } from '@/hooks';
import { parseEspnDate, toNbaDateKey } from '@/lib/date';
import { awaitingResult, winnerFromScores } from '@/lib/league';
import { fetchGameSummary } from '@/lib/espn';
import { hydratePicks, setPickDate, settleStoredPicks, usePicks } from '@/state';

/**
 * Mounted once at the root: reads the saved picks, and writes the winners onto the picks whose games are over. It looks at the
 * scoreboard of each day that has a pick waiting (the same cached query the Calendar uses, one call per day), when the app opens, when
 * it comes back to the foreground and when a new pick is made, so a record is right without opening any game.
 */
export function PickemSync() {
  const client = useQueryClient();
  const picks = usePicks();
  const [wake, setWake] = useState(0);

  useEffect(() => {
    hydratePicks();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setWake((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const waiting = awaitingResult(picks);
    if (waiting.length === 0) return;
    let cancelled = false;
    (async () => {
      const winners: Record<string, string | undefined> = {};
      const onBoard = new Set<string>();
      for (const key of new Set(waiting.map((p) => toNbaDateKey(parseEspnDate(p.date))))) {
        const games = await client
          .fetchQuery({ queryKey: ['scoreboard', key], queryFn: scoreboardQueryFn(client, key), staleTime: 5 * 60 * 1000 })
          .catch(() => undefined);
        for (const g of games ?? []) {
          onBoard.add(g.id);
          if (g.completed) winners[g.id] = winnerFromScores({ id: g.away.teamId, score: g.away.score }, { id: g.home.teamId, score: g.home.score });
        }
      }
      // A game that is not on its day's board was moved (postponed): its own summary says when it is played now and, once over, who won.
      for (const p of waiting.filter((x) => !onBoard.has(x.id) && !winners[x.id])) {
        const summary = await client.fetchQuery({ queryKey: ['game', p.id], queryFn: () => fetchGameSummary(p.id), staleTime: 2 * 60 * 1000 }).catch(() => undefined);
        if (!summary) continue;
        // By the clock, not the text (the two feeds write the same instant differently): only a real move changes the pick.
        if (summary.info.date && Math.abs(parseEspnDate(summary.info.date).getTime() - parseEspnDate(p.date).getTime()) > 5 * 60 * 1000) setPickDate(p.id, summary.info.date);
        if (summary.completed) winners[p.id] = winnerFromScores({ id: summary.away.team.id, score: summary.away.score }, { id: summary.home.team.id, score: summary.home.score });
      }
      if (!cancelled) settleStoredPicks(winners);
    })();
    return () => {
      cancelled = true;
    };
  }, [client, picks, wake]);

  return null;
}
