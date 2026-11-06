import type { Game, Team, TeamDetail } from '@/lib/espn';
import { GAME_LENGTH_MS } from './constants';
import type { NextGameProps } from './types';

const MAX_GAMES = 5;

export type Entry = { date: Date; props: NextGameProps };

/** The game that is on, as the app last saw it: the live entry for that game carries its score and clock. */
export type LiveScore = { gameId: string; myScore: string; oppScore: string; clock: string };

/** Pure: one timeline entry per upcoming game, each taking over when the previous game is over. */
export function buildTimeline(
  team: Pick<Team, 'abbreviation' | 'name' | 'logo' | 'logoDark'>,
  detail: Pick<TeamDetail, 'record'> | undefined,
  schedule: Game[],
  theme: { background: string; surface: string; accent: string },
  now: Date = new Date(),
  live?: LiveScore,
): Entry[] {
  const upcoming = schedule
    .filter((g) => !g.completed && g.date && Date.parse(g.date) + GAME_LENGTH_MS > now.getTime())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_GAMES);

  const base = {
    teamAbbr: team.abbreviation,
    teamName: team.name,
    record: detail?.record ?? '',
    bg: theme.background,
    bg2: theme.surface,
    accent: theme.accent,
    logo: team.logoDark || team.logo || '',
  };

  if (upcoming.length === 0) {
    return [{ date: now, props: { ...base, oppAbbr: '', oppName: '', oppLogo: '', home: true, iso: '', day: '', gameId: '', tag: '', live: false, myScore: '', oppScore: '', clock: '' } }];
  }
  // Each game is two entries: "next game" until tip-off, then "live" until it should be over.
  return upcoming.flatMap((g, i) => {
    const tip = Date.parse(g.date);
    const props: NextGameProps = {
      ...base,
      oppAbbr: g.opponentAbbr,
      oppName: g.opponent,
      oppLogo: g.opponentLogo,
      home: g.home,
      iso: g.date,
      day: new Date(g.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      gameId: g.id,
      tag: g.cup ? 'NBA Cup' : '',
      live: false,
      myScore: '',
      oppScore: '',
      clock: '',
    };
    const from = i === 0 ? now : new Date(Date.parse(upcoming[i - 1].date) + GAME_LENGTH_MS);
    const entries: Entry[] = [];
    if (tip > from.getTime()) entries.push({ date: from, props });
    const scored = live && live.gameId === g.id ? { myScore: live.myScore, oppScore: live.oppScore, clock: live.clock } : {};
    entries.push({ date: new Date(Math.max(tip, from.getTime())), props: { ...props, live: true, ...scored } });
    return entries;
  });
}
