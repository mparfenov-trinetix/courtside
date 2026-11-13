import type { Play } from '@/lib/espn';

// ESPN only publishes full-game box scores, but the play-by-play feed is detailed
// enough to rebuild every counting stat (and minutes / plus-minus) per period.

export type Line = {
  sec: number;
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  pm: number;
};

export type Lineup = { teamId: string; starterIds: string[] };

/** Time a particular five-man group shared the floor, and the score while it did. */
export type LineupLine = { ids: string[]; sec: number; pf: number; pa: number };

export type QuarterStats = {
  periods: number[];
  players: Record<number, Record<string, Line>>;
  teams: Record<number, Record<string, Line>>;
  /** period → team → lineup key (sorted player ids) → totals */
  lineups: Record<number, Record<string, Record<string, LineupLine>>>;
};

export const emptyLine = (): Line => ({
  sec: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
  oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0, pm: 0,
});

function addLines(a: Line, b: Line): Line {
  const out = emptyLine();
  (Object.keys(out) as (keyof Line)[]).forEach((k) => { out[k] = a[k] + b[k]; });
  return out;
}

const periodLength = (period: number) => (period <= 4 ? 720 : 300);

function parseClock(text: string): number {
  if (text.includes(':')) {
    const [m, s] = text.split(':');
    return parseInt(m, 10) * 60 + parseFloat(s);
  }
  const n = parseFloat(text);
  return isNaN(n) ? 0 : n;
}

const isTurnover = (type: string) =>
  /turnover/i.test(type) || /^(Traveling|Discontinue Dribble|Double Dribble|Lane Violation|Palming|Backcourt)/i.test(type);

const isPersonalFoul = (type: string) =>
  /(foul|charge)$/i.test(type.trim()) && !/technical|flopping|turnover/i.test(type);

export function deriveQuarterStats(plays: Play[], lineups: [Lineup, Lineup], homeId: string): QuarterStats {
  const players: QuarterStats['players'] = {};
  const teams: QuarterStats['teams'] = {};
  const lineupStats: QuarterStats['lineups'] = {};
  const teamIds = [lineups[0].teamId, lineups[1].teamId];
  const opponent = (id?: string) => (id === teamIds[0] ? teamIds[1] : id === teamIds[1] ? teamIds[0] : undefined);

  const maxPeriod = plays.reduce((m, p) => Math.max(m, p.period), 0);
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const pLine = (period: number, id: string): Line => {
    const byId = (players[period] ??= {});
    return (byId[id] ??= emptyLine());
  };
  const tLine = (period: number, id?: string): Line | undefined => {
    if (!id) return undefined;
    const byId = (teams[period] ??= {});
    return (byId[id] ??= emptyLine());
  };

  // Which team each player belongs to (needed for plus-minus).
  const playerTeam = new Map<string, string>();
  const onCourt = new Map<string, Set<string>>();
  lineups.forEach((l) => {
    onCourt.set(l.teamId, new Set(l.starterIds));
    l.starterIds.forEach((id) => playerTeam.set(id, l.teamId));
  });

  let cursor = periodLength(1);
  let currentPeriod = 1;
  let lastHome = 0;
  let lastAway = 0;

  const flush = (period: number, clock: number, homeScore: number, awayScore: number) => {
    const elapsed = Math.max(0, cursor - clock);
    const dHome = homeScore - lastHome;
    const dAway = awayScore - lastAway;
    onCourt.forEach((set, teamId) => {
      const diff = teamId === homeId ? dHome - dAway : dAway - dHome;
      set.forEach((id) => {
        const line = pLine(period, id);
        line.sec += elapsed;
        line.pm += diff;
      });
      if (set.size === 5 && (elapsed > 0 || dHome !== 0 || dAway !== 0)) {
        const ids = [...set].sort();
        const byTeam = ((lineupStats[period] ??= {})[teamId] ??= {});
        const entry = (byTeam[ids.join('|')] ??= { ids, sec: 0, pf: 0, pa: 0 });
        entry.sec += elapsed;
        entry.pf += teamId === homeId ? dHome : dAway;
        entry.pa += teamId === homeId ? dAway : dHome;
      }
    });
    cursor = clock;
    lastHome = homeScore;
    lastAway = awayScore;
  };

  for (const play of plays) {
    if (play.period !== currentPeriod) {
      // Close out the previous period at 0:00 using the last known score.
      flush(currentPeriod, 0, lastHome, lastAway);
      currentPeriod = play.period;
      cursor = periodLength(currentPeriod);
    }

    const type = play.typeText;
    const [p0, p1] = play.athleteIds;
    const team = tLine(play.period, play.teamId);
    const oppTeam = tLine(play.period, opponent(play.teamId));

    if (type === 'Substitution') {
      flush(play.period, parseClock(play.clockText), play.homeScore, play.awayScore);
      const inId = p0;
      const outId = p1;
      if (inId && play.teamId) {
        const set = onCourt.get(play.teamId);
        if (set) {
          if (outId) set.delete(outId);
          set.add(inId);
          playerTeam.set(inId, play.teamId);
        }
      }
      continue;
    }

    if (play.shooting) {
      const shooter = p0 ? pLine(play.period, p0) : undefined;
      const made = play.scoreValue > 0;
      // ESPN's box score ignores missed buzzer-beater heaves.
      if (!made && /^Heave/i.test(type) && parseClock(play.clockText) <= 1) continue;
      if (/^Free Throw/i.test(type)) {
        for (const l of [shooter, team]) if (l) { l.fta += 1; if (made) { l.ftm += 1; l.pts += 1; } }
      } else {
        const three = play.pointsAttempted === 3;
        for (const l of [shooter, team]) {
          if (!l) continue;
          l.fga += 1;
          if (three) l.tpa += 1;
          if (made) {
            l.fgm += 1;
            l.pts += play.scoreValue;
            if (three) l.tpm += 1;
          }
        }
        if (made && p1) {
          pLine(play.period, p1).ast += 1;
          if (team) team.ast += 1;
        }
        if (!made && p1 && / blocks /i.test(play.text)) {
          pLine(play.period, p1).blk += 1;
          if (oppTeam) oppTeam.blk += 1;
        }
      }
      continue;
    }

    if (/Rebound/i.test(type)) {
      const off = /offensive/i.test(type);
      // Team rebounds (no athlete) are excluded, matching ESPN's box score totals.
      if (!p0) continue;
      for (const l of [pLine(play.period, p0), team]) if (l) { if (off) l.oreb += 1; else l.dreb += 1; }
      continue;
    }

    if (isTurnover(type)) {
      if (p0) {
        pLine(play.period, p0).to += 1;
        if (team) team.to += 1;
      }
      if (p1 && /steals/i.test(play.text)) {
        pLine(play.period, p1).stl += 1;
        if (oppTeam) oppTeam.stl += 1;
      }
      continue;
    }

    if (isPersonalFoul(type)) {
      if (p0) pLine(play.period, p0).pf += 1;
      if (team) team.pf += 1;
    }
  }

  const last = plays[plays.length - 1];
  if (last) flush(currentPeriod, 0, last.homeScore, last.awayScore);

  periods.forEach((p) => { players[p] ??= {}; teams[p] ??= {}; lineupStats[p] ??= {}; });
  return { periods, players, teams, lineups: lineupStats };
}

export function sumPeriods(
  data: Record<number, Record<string, Line>>,
  periods: number[],
  id: string,
): Line {
  return periods.reduce((acc, p) => (data[p]?.[id] ? addLines(acc, data[p][id]) : acc), emptyLine());
}

const made = (m: number, a: number) => `${m}-${a}`;

/** Format a derived line with the same keys ESPN uses in `BoxScorePlayer.stats`. */
export function lineToStats(l: Line): Record<string, string> {
  return {
    MIN: String(Math.round(l.sec / 60)),
    PTS: String(l.pts),
    REB: String(l.oreb + l.dreb),
    AST: String(l.ast),
    TO: String(l.to),
    STL: String(l.stl),
    BLK: String(l.blk),
    '3PT': made(l.tpm, l.tpa),
    FG: made(l.fgm, l.fga),
    FT: made(l.ftm, l.fta),
    OREB: String(l.oreb),
    DREB: String(l.dreb),
    PF: String(l.pf),
    '+/-': l.pm > 0 ? `+${l.pm}` : String(l.pm),
  };
}

/** Five-man groups for a team over the chosen periods (all periods when null), most minutes first. */
export function sumLineups(stats: QuarterStats, periods: number[] | null, teamId: string): LineupLine[] {
  const merged = new Map<string, LineupLine>();
  for (const p of periods ?? stats.periods) {
    const byKey = stats.lineups[p]?.[teamId] ?? {};
    for (const [key, l] of Object.entries(byKey)) {
      const cur = merged.get(key) ?? { ids: l.ids, sec: 0, pf: 0, pa: 0 };
      cur.sec += l.sec;
      cur.pf += l.pf;
      cur.pa += l.pa;
      merged.set(key, cur);
    }
  }
  return [...merged.values()].sort((a, b) => b.sec - a.sec);
}
