import { useState } from 'react';

import type { BoxScorePlayer } from '@/lib/espn';
import { gameFraction, minutesOf, projectedRating } from '@/lib/game';

/** Both teams' minutes between two refreshes: 40 is four minutes of the game (ten players), three or four refreshes a quarter. */
export const REFRESH_TEAM_MINUTES = 40;

type Snapshot = { minutes: number; ratings: Map<string, number> };

const teamMinutes = (players: BoxScorePlayer[]) => players.reduce((sum, p) => sum + minutesOf(p.stats), 0);

function ratingsOf(sides: BoxScorePlayer[][]): Map<string, number> {
  const ratings = new Map<string, number>();
  for (const players of sides) {
    const fraction = gameFraction(players.map((p) => p.stats));
    for (const p of players) {
      const rating = projectedRating(p.stats, fraction);
      if (rating !== undefined) ratings.set(p.id, rating);
    }
  }
  return ratings;
}

/**
 * The projected ratings of a game that is on (`projectedRating`), taken when the box score opens and again once four more minutes of the
 * game have been played, not on every play: a rating that moved with each basket would be noise. Between refreshes the numbers stand still
 * (a player who comes on meanwhile has none until the next one). Undefined when the game is not live.
 */
export function useLiveRatings(away: BoxScorePlayer[], home: BoxScorePlayer[], live: boolean): Map<string, number> | undefined {
  const minutes = teamMinutes(away) + teamMinutes(home);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  if (!live) return undefined;
  if (snapshot && minutes - snapshot.minutes < REFRESH_TEAM_MINUTES && minutes >= snapshot.minutes) return snapshot.ratings;
  const fresh: Snapshot = { minutes, ratings: ratingsOf([away, home]) };
  setSnapshot(fresh);
  return fresh.ratings;
}
