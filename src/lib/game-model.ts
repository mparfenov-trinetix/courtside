import type { BoxScorePlayer, BoxScoreTeam, Play } from '@/lib/espn';
import { lineToStats, sumPeriods, type Line, type QuarterStats } from '@/lib/quarter-stats';

// ─── Box score columns ────────────────────────────────────────────────────────

export const COLS = ['MIN', 'PTS', 'REB', 'AST', 'TO', 'STL', 'BLK', '3PT', 'FG', 'FT', 'PF', '+/-'] as const;
export type Col = (typeof COLS)[number];

export const COL_W: Record<Col, number> = {
  MIN: 40, PTS: 38, REB: 38, AST: 38, TO: 34, STL: 34, BLK: 34, '3PT': 50, FG: 56, FT: 50, PF: 30, '+/-': 42,
};

// ─── Period selection ─────────────────────────────────────────────────────────

export type PeriodOption = { key: string; label: string; periods: number[] | null };

export const periodLabel = (n: number) => (n <= 4 ? `Q${n}` : `OT${n - 4}`);

export function buildPeriodOptions(count: number): PeriodOption[] {
  const opts: PeriodOption[] = [{ key: 'full', label: 'Full', periods: null }];
  for (let n = 1; n <= count; n++) opts.push({ key: `p${n}`, label: periodLabel(n), periods: [n] });
  if (count >= 2) opts.push({ key: 'h1', label: '1H', periods: [1, 2] });
  if (count >= 4) opts.push({ key: 'h2', label: '2H', periods: [3, 4] });
  return opts;
}

export function playersWithStats(
  team: BoxScoreTeam,
  derived: QuarterStats | null,
  periods: number[] | null,
): BoxScorePlayer[] {
  const all = [...team.starters, ...team.bench];
  if (!periods || !derived) return all;
  return all
    .map((player) => ({ player, line: sumPeriods(derived.players, periods, player.id) }))
    .filter(({ line }) => line.sec > 0)
    .map(({ player, line }) => ({ ...player, stats: lineToStats(line) }));
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

export type SortDir = 'desc' | 'asc';

export function parseStatNum(val?: string): number {
  if (!val || val === '–') return -Infinity;
  // "8-18" sorts by makes, "+5" / "-3" by signed value
  const m = /^[+-]?\d+(\.\d+)?/.exec(val.trim());
  return m ? parseFloat(m[0]) : -Infinity;
}

// ─── Team stats ───────────────────────────────────────────────────────────────

export type TeamNums = {
  pts: number; fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number;
  reb: number; oreb: number; dreb: number; ast: number; to: number; stl: number; blk: number; pf: number;
};

function parseMadeAtt(val?: string): [number, number] {
  if (!val) return [0, 0];
  const [m, a] = val.split('-').map(Number);
  return [isNaN(m) ? 0 : m, isNaN(a) ? 0 : a];
}

export function numsFromTotals(t: Record<string, string>): TeamNums | null {
  if (!t['PTS'] && !t['FG']) return null;
  const n = (k: string) => {
    const v = Number(t[k]);
    return isNaN(v) ? 0 : v;
  };
  const [fgm, fga] = parseMadeAtt(t['FG']);
  const [tpm, tpa] = parseMadeAtt(t['3PT']);
  const [ftm, fta] = parseMadeAtt(t['FT']);
  return {
    pts: n('PTS'), fgm, fga, tpm, tpa, ftm, fta,
    reb: n('REB'), oreb: n('OREB'), dreb: n('DREB'), ast: n('AST'), to: n('TO'), stl: n('STL'), blk: n('BLK'), pf: n('PF'),
  };
}

export function numsFromLine(l: Line): TeamNums {
  return {
    pts: l.pts, fgm: l.fgm, fga: l.fga, tpm: l.tpm, tpa: l.tpa, ftm: l.ftm, fta: l.fta,
    reb: l.oreb + l.dreb, oreb: l.oreb, dreb: l.dreb, ast: l.ast, to: l.to, stl: l.stl, blk: l.blk, pf: l.pf,
  };
}

export type StatBarConfig = {
  label: string;
  away: number;
  home: number;
  awayText: string;
  homeText: string;
  awaySub?: string;
  homeSub?: string;
  lowerIsBetter?: boolean;
};

const int = (label: string, av: number, hv: number, lowerIsBetter?: boolean): StatBarConfig => ({
  label, away: av, home: hv, awayText: String(av), homeText: String(hv), lowerIsBetter,
});

const pct = (label: string, am: number, aa: number, hm: number, ha: number): StatBarConfig => ({
  label,
  away: aa > 0 ? am / aa : 0,
  home: ha > 0 ? hm / ha : 0,
  awayText: aa > 0 ? `${Math.round((am / aa) * 100)}%` : '–',
  homeText: ha > 0 ? `${Math.round((hm / ha) * 100)}%` : '–',
  awaySub: aa > 0 ? `${am}/${aa}` : undefined,
  homeSub: ha > 0 ? `${hm}/${ha}` : undefined,
});

/** The numbers most people look at first. */
export function buildKeyStats(a: TeamNums, h: TeamNums): StatBarConfig[] {
  return [
    pct('Field goals', a.fgm, a.fga, h.fgm, h.fga),
    pct('3-pointers', a.tpm, a.tpa, h.tpm, h.tpa),
    int('Rebounds', a.reb, h.reb),
    int('Assists', a.ast, h.ast),
    int('Turnovers', a.to, h.to, true),
    pct('Free throws', a.ftm, a.fta, h.ftm, h.fta),
  ];
}

/** Everything else, behind "Show all stats". */
export function buildMoreStats(a: TeamNums, h: TeamNums): StatBarConfig[] {
  return [
    int('Steals', a.stl, h.stl),
    int('Blocks', a.blk, h.blk),
    int('Fouls', a.pf, h.pf, true),
  ];
}

/** Dean Oliver's four factors: what actually decides games. */
export function buildFourFactors(a: TeamNums, h: TeamNums): StatBarConfig[] {
  const rate = (label: string, av: number, hv: number, lowerIsBetter?: boolean): StatBarConfig => ({
    label, away: av, home: hv,
    awayText: `${(av * 100).toFixed(1)}%`, homeText: `${(hv * 100).toFixed(1)}%`, lowerIsBetter,
  });
  const efg = (t: TeamNums) => (t.fga > 0 ? (t.fgm + 0.5 * t.tpm) / t.fga : 0);
  const tov = (t: TeamNums) => {
    const poss = t.fga + 0.44 * t.fta + t.to;
    return poss > 0 ? t.to / poss : 0;
  };
  const orb = (t: TeamNums, opp: TeamNums) => (t.oreb + opp.dreb > 0 ? t.oreb / (t.oreb + opp.dreb) : 0);
  const ftr = (t: TeamNums) => (t.fga > 0 ? t.ftm / t.fga : 0);
  const rows = [
    rate('Shooting (eFG%)', efg(a), efg(h)),
    rate('Turnover rate', tov(a), tov(h), true),
    rate('Off. rebound rate', orb(a, h), orb(h, a)),
    rate('Free throws per shot', ftr(a), ftr(h)),
  ];
  // Without the rebound split (some feeds omit it) the rebound-rate row would read 0% for both.
  return a.oreb + a.dreb + h.oreb + h.dreb === 0 ? rows.filter((r) => r.label !== 'Off. rebound rate') : rows;
}

// ─── Game flow ────────────────────────────────────────────────────────────────

export type Run = { teamId: string; points: number; start: Play; end: Play };

export type Flow = {
  /** Home margin (home − away) after each play. */
  margins: number[];
  leadChanges: number;
  ties: number;
  /** Biggest lead each side held, with the play where it peaked. */
  largestHome?: { margin: number; play: Play };
  largestAway?: { margin: number; play: Play };
  bestHomeRun?: Run;
  bestAwayRun?: Run;
  /** The play that put the eventual leader ahead for good. */
  lastLeadChange?: Play;
};

export function deriveFlow(plays: Play[], homeId: string, awayId: string): Flow {
  const flow: Flow = { margins: [], leadChanges: 0, ties: 0 };
  let lastSign = 0;
  let prevHome = 0;
  let prevAway = 0;
  let run: Run | null = null;

  const closeRun = () => {
    if (!run) return;
    if (run.teamId === homeId && run.points > (flow.bestHomeRun?.points ?? 0)) flow.bestHomeRun = run;
    if (run.teamId === awayId && run.points > (flow.bestAwayRun?.points ?? 0)) flow.bestAwayRun = run;
    run = null;
  };

  for (const play of plays) {
    const margin = play.homeScore - play.awayScore;
    flow.margins.push(margin);

    const dHome = play.homeScore - prevHome;
    const dAway = play.awayScore - prevAway;
    if (dHome > 0 || dAway > 0) {
      const teamId = dHome > 0 ? homeId : awayId;
      const pts = dHome > 0 ? dHome : dAway;
      if (run && run.teamId === teamId) {
        run.points += pts;
        run.end = play;
      } else {
        closeRun();
        run = { teamId, points: pts, start: play, end: play };
      }
    }
    prevHome = play.homeScore;
    prevAway = play.awayScore;

    const sign = Math.sign(margin);
    if (sign !== 0 && lastSign !== 0 && sign !== lastSign) {
      flow.leadChanges += 1;
      flow.lastLeadChange = play;
    }
    if (sign === 0 && lastSign !== 0 && dHome + dAway > 0) flow.ties += 1;
    if (sign !== 0) lastSign = sign;

    if (margin > (flow.largestHome?.margin ?? 0)) flow.largestHome = { margin, play };
    if (-margin > (flow.largestAway?.margin ?? 0)) flow.largestAway = { margin: -margin, play };
  }
  closeRun();
  return flow;
}
