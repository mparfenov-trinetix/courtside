import { BASE, getJson } from './client';
import type { Json } from './client';
import { classifyGame, cupStage, seasonOfDate, seriesLine, teamLogo, type GameKind } from './common';
import { eraLogoFor } from './franchise';

export type ScoreboardTeam = {
  teamId: string;
  name: string;
  abbreviation: string;
  logo: string;
  score?: number;
  winner?: boolean;
  /** Overall record, "4-2". */
  record?: string;
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
  /** Regular season, playoffs, play-in, Cup, All-Star or preseason. */
  kind: GameKind;
  /** ESPN's note for the game ("West Finals - Game 2"). */
  note?: string;
  /** A playoff game's series as it stands after it (or now, for one still to come): "ORL leads 3-2". */
  series?: string;
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
      // A game from before a team's last name change shows the logo the team wore then, where the app has it.
      logo: (ev.date && eraLogoFor(String(c.team?.id ?? ''), seasonOfDate(ev.date))) || teamLogo(c.team?.abbreviation, c.team?.logo ?? c.team?.logos?.[0]?.href),
      score: c.score != null ? parseFloat(String(c.score)) || undefined : undefined,
      winner: c.winner === true,
      record: ((c.records as Json[] | undefined)?.find((r) => r.type === 'total') ?? (c.records as Json[] | undefined)?.[0])?.summary || undefined,
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
      kind: classifyGame(comp.notes?.[0]?.headline, ev.season?.type),
      note: typeof comp.notes?.[0]?.headline === 'string' ? comp.notes[0].headline : undefined,
      series: comp.series?.type === 'playoff' ? seriesLine(comp.series.summary) : undefined,
    };
  });
}

/** Does this scoreboard game involve the team? */
export const involvesTeam = (g: ScoreboardGame, teamId?: string | null) =>
  !!teamId && (g.home.teamId === teamId || g.away.teamId === teamId);
