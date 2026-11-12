import type { GameLogEntry } from '../espn';

/** One game two players played against each other, from the first player's side: `a` and `b` are their lines, the teams are the ones they played for that night. */
export type PlayerMeeting = {
  gameId: string;
  date: string;
  playoffs: boolean;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  a: { pts: number; reb: number; ast: number; min: number };
  b: { pts: number; reb: number; ast: number; min: number };
};

const line = (g: GameLogEntry) => ({ pts: g.pts, reb: g.reb, ast: g.ast, min: g.min });

/**
 * The games two players both played in for opposite teams, newest first: the same game in both their logs, with each log naming a different
 * opponent (the same opponent means they were teammates that night). Each player's team that night is the other's `opponent` in the log.
 */
export function playerHeadToHead(a: GameLogEntry[], b: GameLogEntry[]): PlayerMeeting[] {
  const theirs = new Map(b.map((g) => [g.gameId, g]));
  return a
    .flatMap((ga): PlayerMeeting[] => {
      const gb = theirs.get(ga.gameId);
      if (!gb || gb.opponentId === ga.opponentId) return [];
      return [
        {
          gameId: ga.gameId,
          date: ga.date,
          playoffs: !!ga.playoffs,
          teamA: gb.opponent,
          teamB: ga.opponent,
          scoreA: ga.teamScore,
          scoreB: ga.opponentScore,
          a: line(ga),
          b: line(gb),
        },
      ];
    })
    .sort((x, y) => y.date.localeCompare(x.date));
}

/** Who won how many of the meetings (by the game's score), and the two players' averages in them. */
export function meetingsSummary(meetings: PlayerMeeting[]) {
  const n = meetings.length;
  const avg = (pick: (m: PlayerMeeting) => number) => (n === 0 ? 0 : meetings.reduce((sum, m) => sum + pick(m), 0) / n);
  return {
    games: n,
    winsA: meetings.filter((m) => m.scoreA > m.scoreB).length,
    winsB: meetings.filter((m) => m.scoreB > m.scoreA).length,
    a: { pts: avg((m) => m.a.pts), reb: avg((m) => m.a.reb), ast: avg((m) => m.a.ast) },
    b: { pts: avg((m) => m.b.pts), reb: avg((m) => m.b.reb), ast: avg((m) => m.b.ast) },
  };
}
