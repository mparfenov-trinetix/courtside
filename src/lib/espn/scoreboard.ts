import { BASE, getJson } from './client';
import type { Json } from './client';
import { cupStage, teamLogo } from './common';

export type ScoreboardTeam = {
  teamId: string;
  name: string;
  abbreviation: string;
  logo: string;
  score?: number;
  winner?: boolean;
};

export type ScoreboardGame = {
  id: string;
  date: string;
  status: string;
  completed: boolean;
  inProgress: boolean;
  home: ScoreboardTeam;
  away: ScoreboardTeam;
  /** NBA Cup stage when the game is part of the Cup. */
  cup?: string;
};

export async function fetchScoreboardByDate(date: string): Promise<ScoreboardGame[]> {
  // date format: YYYYMMDD
  const json = await getJson(`${BASE}/scoreboard?dates=${date}&limit=20`);
  const events: Json[] = json.events ?? [];
  return events.map((ev) => {
    const comp: Json = ev.competitions?.[0] ?? {};
    const status: Json = comp.status?.type ?? {};
    const competitors: Json[] = comp.competitors ?? [];

    const parseTeam = (c: Json): ScoreboardTeam => ({
      teamId: String(c.team?.id ?? ''),
      name: c.team?.displayName ?? c.team?.name ?? '',
      abbreviation: c.team?.abbreviation ?? '',
      logo: teamLogo(c.team?.abbreviation, c.team?.logo ?? c.team?.logos?.[0]?.href),
      score: c.score != null ? parseFloat(String(c.score)) || undefined : undefined,
      winner: c.winner === true,
    });

    const home = parseTeam(competitors.find((c) => c.homeAway === 'home') ?? competitors[0] ?? {});
    const away = parseTeam(competitors.find((c) => c.homeAway === 'away') ?? competitors[1] ?? {});

    return {
      id: String(ev.id ?? ''),
      date: String(ev.date ?? ''),
      status: status.shortDetail ?? status.description ?? '',
      completed: status.completed === true,
      inProgress: status.state === 'in' || status.name === 'STATUS_IN_PROGRESS',
      home,
      away,
      cup: cupStage(comp.notes?.[0]?.headline),
    };
  });
}

/** Does this scoreboard game involve the team? */
export const involvesTeam = (g: ScoreboardGame, teamId?: string | null) =>
  !!teamId && (g.home.teamId === teamId || g.away.teamId === teamId);
