import type { CupGame, CupSide } from '@/lib/espn';

export type Conference = 'east' | 'west';

export type CupRow = {
  teamId: string;
  abbr: string;
  logo: string;
  w: number;
  l: number;
  pf: number;
  pa: number;
  diff: number;
  /** Group games still to play. */
  left: number;
  rank: number;
  /** "leader": would advance as group winner. "wildcard": best runner-up in the conference right now. */
  position: 'leader' | 'wildcard' | null;
};

export type CupGroup = {
  /** Stable key: the group's lowest team id. */
  id: string;
  conference: Conference | null;
  /** "East 1", "West 3"... ESPN doesn't publish the A/B/C letters, so groups are numbered. */
  label: string;
  rows: CupRow[];
  games: CupGame[];
};

export type Cup = {
  groups: CupGroup[];
  /** Knockout games (quarterfinals onward), earliest first. */
  knockout: CupGame[];
  groupGames: CupGame[];
  groupGamesLeft: number;
  /** True once every group game has been played. */
  groupStageDone: boolean;
};

const isGroup = (g: CupGame) => /group/i.test(g.stage);

/** Teams that play each other in group games form a connected cluster: that cluster is a group. */
function clusters(games: CupGame[]): string[][] {
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const g of games) {
    link(g.home.teamId, g.away.teamId);
    link(g.away.teamId, g.home.teamId);
  }
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const comp: string[] = [];
    const stack = [start];
    while (stack.length) {
      const t = stack.pop()!;
      if (seen.has(t)) continue;
      seen.add(t);
      comp.push(t);
      stack.push(...(adj.get(t) ?? []));
    }
    out.push(comp.sort());
  }
  return out;
}

type Acc = { side: CupSide; w: number; l: number; pf: number; pa: number; left: number };

/** Wins, then head-to-head when exactly two teams are level, then point differential, then points scored. */
function rankRows(accs: Acc[], games: CupGame[]): Acc[] {
  const h2h = (a: Acc, b: Acc) => {
    let net = 0;
    for (const g of games) {
      if (!g.completed || g.home.score == null || g.away.score == null) continue;
      const ids = [g.home.teamId, g.away.teamId];
      if (!ids.includes(a.side.teamId) || !ids.includes(b.side.teamId)) continue;
      const aHome = g.home.teamId === a.side.teamId;
      const aWon = (g.home.score > g.away.score) === aHome;
      net += aWon ? 1 : -1;
    }
    return net;
  };
  const byDiff = (a: Acc, b: Acc) => b.pf - b.pa - (a.pf - a.pa) || b.pf - a.pf;
  const sorted = [...accs].sort((a, b) => b.w - a.w);
  const out: Acc[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j < sorted.length && sorted[j].w === sorted[i].w) j++;
    const level = sorted.slice(i, j);
    if (level.length === 2) {
      const net = h2h(level[0], level[1]);
      level.sort((a, b) => (net !== 0 ? (a === level[0] ? -net : net) : byDiff(a, b)));
    } else {
      level.sort(byDiff);
    }
    out.push(...level);
    i = j;
  }
  return out;
}

/**
 * Whether the NBA Cup is worth reading for a team: one of its own games is a Cup game still to come, or finished within the last two weeks
 * (the group tables and the knockout are in play, and just after). Reading the Cup means reading all thirty team schedules, so the team page
 * asks its own schedule first: for most of the year there is no reason to.
 */
export function cupIsOn(schedule: { cup?: string; completed: boolean; date: string }[] | undefined, now: number = Date.now()): boolean {
  const TWO_WEEKS = 14 * 24 * 3600_000;
  return (schedule ?? []).some((g) => !!g.cup && (!g.completed || now - Date.parse(g.date) < TWO_WEEKS));
}

export function buildCup(games: CupGame[], conferenceOf: Record<string, Conference | undefined>): Cup {
  const groupGames = games.filter(isGroup);
  const knockout = games.filter((g) => !isGroup(g));

  const groups: CupGroup[] = clusters(groupGames).map((teamIds) => {
    const mine = groupGames.filter((g) => teamIds.includes(g.home.teamId));
    const accs = new Map<string, Acc>();
    const acc = (s: CupSide) => {
      if (!accs.has(s.teamId)) accs.set(s.teamId, { side: s, w: 0, l: 0, pf: 0, pa: 0, left: 0 });
      return accs.get(s.teamId)!;
    };
    for (const g of mine) {
      const h = acc(g.home);
      const a = acc(g.away);
      if (!g.completed || g.home.score == null || g.away.score == null) {
        h.left += 1;
        a.left += 1;
        continue;
      }
      h.pf += g.home.score;
      h.pa += g.away.score;
      a.pf += g.away.score;
      a.pa += g.home.score;
      if (g.home.score > g.away.score) {
        h.w += 1;
        a.l += 1;
      } else {
        a.w += 1;
        h.l += 1;
      }
    }
    const ranked = rankRows([...accs.values()], mine);
    const confs = teamIds.map((id) => conferenceOf[id]).filter(Boolean) as Conference[];
    const conference = confs.length ? (confs.filter((c) => c === 'east').length >= confs.length / 2 ? 'east' : 'west') : null;
    return {
      id: teamIds[0],
      conference,
      label: '',
      games: mine,
      rows: ranked.map((a, i) => ({
        teamId: a.side.teamId,
        abbr: a.side.abbr,
        logo: a.side.logo,
        w: a.w,
        l: a.l,
        pf: a.pf,
        pa: a.pa,
        diff: a.pf - a.pa,
        left: a.left,
        rank: i + 1,
        // A team that hasn't played yet is only first because of the sort, not because it leads.
        position: i === 0 && a.w + a.l > 0 ? 'leader' : null,
      })),
    };
  });

  // Number the groups within each conference (by their lowest team id, so the order never shuffles).
  for (const conf of ['east', 'west'] as const) {
    groups
      .filter((g) => g.conference === conf)
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
      .forEach((g, i) => (g.label = `${conf === 'east' ? 'East' : 'West'} ${i + 1}`));
  }
  groups.filter((g) => !g.label).forEach((g, i) => (g.label = `Group ${i + 1}`));
  groups.sort((a, b) => a.label.localeCompare(b.label));

  // One wildcard per conference: the best runner-up (wins, then point differential, then points scored).
  for (const conf of ['east', 'west'] as const) {
    const seconds = groups
      .filter((g) => g.conference === conf)
      .map((g) => g.rows[1])
      .filter((r): r is CupRow => !!r && r.w + r.l > 0)
      .sort((a, b) => b.w - a.w || b.diff - a.diff || b.pf - a.pf);
    if (seconds[0]) seconds[0].position = 'wildcard';
  }

  const groupGamesLeft = groupGames.filter((g) => !g.completed).length;
  return {
    groups,
    knockout: [...knockout].sort((a, b) => a.date.localeCompare(b.date)),
    groupGames: [...groupGames].sort((a, b) => a.date.localeCompare(b.date)),
    groupGamesLeft,
    groupStageDone: groupGames.length > 0 && groupGamesLeft === 0,
  };
}

/** The projected eight-team knockout field: six group leaders and two wildcards. */
export function projectedField(cup: Cup): CupRow[] {
  return cup.groups.flatMap((g) => g.rows.filter((r) => r.position));
}
