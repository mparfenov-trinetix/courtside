import type { CupGame, CupSide, ConferenceStandings } from '@/lib/espn';

/**
 * Builds playoff, play-in and NBA Cup brackets out of tagged games (see fetchTaggedGames in espn.ts).
 * Pure functions: no network, no React.
 */

export type Conf = 'east' | 'west';
export type RoundKey = 'playin' | 'playin-final' | 'r1' | 'r2' | 'r3' | 'finals' | 'cup-qf' | 'cup-sf' | 'cup-final';

export type SeriesTeam = { teamId: string; abbr: string; logo: string; seed?: number };

export type SeriesGame = {
  id: string;
  date: string;
  label: string; // "Game 3", "Play-In"
  completed: boolean;
  home: CupSide;
  away: CupSide;
  winnerId?: string;
};

export type Series = {
  id: string;
  round: RoundKey;
  conference?: Conf;
  /** The better seed (or, for Cup games, the home side). */
  top: SeriesTeam;
  bottom: SeriesTeam;
  topWins: number;
  bottomWins: number;
  bestOf: number;
  games: SeriesGame[];
  winnerId?: string;
  /** "OKC wins 4-2", "BOS leads 3-2", "Series tied 1-1", "Starts Apr 19". */
  status: string;
  /** Position in its round, top to bottom, so the bracket lines up with the round before. */
  order: number;
  /** Which bracket label this belongs to, e.g. "Play-In · 7 vs 8". */
  title?: string;
};

export type Round = { key: RoundKey; name: string; series: Series[] };

export const ROUND_NAMES: Record<RoundKey, string> = {
  playin: 'Play-In',
  'playin-final': '8th seed game',
  r1: 'First Round',
  r2: 'Conference Semifinals',
  r3: 'Conference Finals',
  finals: 'NBA Finals',
  'cup-qf': 'Quarterfinals',
  'cup-sf': 'Semifinals',
  'cup-final': 'Championship',
};

// ─── Parsing ESPN's notes ─────────────────────────────────────────────────────

/** The play-in tournament began in 2020-21 (season 2021). The 2019-20 bubble had one play-in game, which isn't a tournament. */
export const PLAY_IN_FROM = 2021;
/** ESPN's notes name each playoff game's round from the 2009-10 season on (named 2010); before that the rounds are worked out (`inferPlayoffNotes`). */
export const NOTED_FROM = 2010;
/**
 * The first season the bracket is rebuilt: 2002-03 (named 2003). ESPN's playoff schedules of 2000-01 and 2001-02 are missing games (the
 * Finals of 2001, seven games of 2002), which would show wrong series; 2003 on rebuilds to the right champion every year.
 */
export const PLAYOFFS_FROM = 2003;
export const hasPlayIn = (season: number) => season >= PLAY_IN_FROM;

/** "West 1st Round - Game 3" -> { round: 'r1', conference: 'west', game: 3 }. */
export function parsePlayoffNote(note: string): { round: RoundKey; conference?: Conf; game?: number } | null {
  // Newer notes say "West 1st Round", older ones "WESTERN CONFERENCE 1st ROUND".
  const m = /^(East(?:ern)?|West(?:ern)?)?(?:\s+Conference)?\s*(1st Round|Semifinals|Finals|NBA Finals)\b(?:\s*-\s*Game\s*(\d+))?/i.exec(note.trim());
  if (!m) return null;
  const conference: Conf | undefined = m[1] ? (m[1].toLowerCase().startsWith('e') ? 'east' : 'west') : undefined;
  const word = m[2].toLowerCase();
  const round: RoundKey = word === '1st round' ? 'r1' : word === 'semifinals' ? 'r2' : word === 'nba finals' || !conference ? 'finals' : 'r3';
  return { round, conference, game: m[3] ? Number(m[3]) : undefined };
}

/** Team id to conference, from a season's standings. */
export function conferenceMap(standings: ConferenceStandings): Record<string, Conf> {
  const out: Record<string, Conf> = {};
  for (const e of standings.east) out[e.teamId] = 'east';
  for (const e of standings.west) out[e.teamId] = 'west';
  return out;
}

/**
 * Before 2009-10 ESPN's playoff notes say "PLAYOFFS" or nothing, not the round. The round is still in who played whom: a team meets
 * another once per postseason, and its k-th series is round k (the Finals is the fourth). So the games are grouped into series by their
 * pair of teams, each team's series are ordered by their first game, and every game gets the note ESPN writes from 2010 on
 * ("West 1st Round - Game 3", "East Finals - Game 7", "NBA Finals - Game 2"), which the rest of the app already reads. A conference
 * comes from the season's standings. A game that cannot be placed keeps its own note.
 */
export function inferPlayoffNotes(games: CupGame[], conferenceOf: Record<string, Conf>): CupGame[] {
  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date));
  const series = new Map<string, CupGame[]>();
  for (const g of sorted) {
    const pair = [g.home.teamId, g.away.teamId].sort().join('-');
    series.set(pair, [...(series.get(pair) ?? []), g]);
  }
  // Each team's series in the order they began (the map keeps first-game order).
  const bySeriesOfTeam = new Map<string, string[]>();
  for (const [pair] of series) for (const id of pair.split('-')) bySeriesOfTeam.set(id, [...(bySeriesOfTeam.get(id) ?? []), pair]);
  const note = new Map<string, string>();
  for (const [pair, list] of series) {
    const [a, b] = pair.split('-');
    const round = Math.min(4, Math.max((bySeriesOfTeam.get(a) ?? []).indexOf(pair), (bySeriesOfTeam.get(b) ?? []).indexOf(pair)) + 1);
    const conf = conferenceOf[a] ?? conferenceOf[b];
    if (round < 4 && !conf) continue;
    const name = ['1st Round', 'Semifinals', 'Finals', 'NBA Finals'][round - 1];
    const prefix = round < 4 ? `${conf === 'east' ? 'East' : 'West'} ` : '';
    list.forEach((g, i) => note.set(g.id, `${prefix}${name} - Game ${i + 1}`));
  }
  return games.map((g) => (note.has(g.id) ? { ...g, stage: note.get(g.id)! } : g));
}

/** "NBA Play-In - East - 9th Place vs 10th Place" -> { conference: 'east', title: '9th Place vs 10th Place' }. */
export function parsePlayInNote(note: string): { conference: Conf; title: string } | null {
  const m = /Play-In\s*-\s*(East|West)\s*-\s*(.+)$/i.exec(note);
  return m ? { conference: m[1].toLowerCase() as Conf, title: m[2].trim() } : null;
}

// ─── Series from games ────────────────────────────────────────────────────────

const winnerOf = (g: CupGame): string | undefined =>
  g.completed && g.home.score != null && g.away.score != null
    ? g.home.score > g.away.score
      ? g.home.teamId
      : g.away.teamId
    : undefined;

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

type Draft = {
  id: string;
  round: RoundKey;
  conference?: Conf;
  title?: string;
  teams: Map<string, SeriesTeam>;
  games: { game: CupGame; label: string }[];
  bestOf: number;
};

function finish(d: Draft, seedOf: (id: string) => number | undefined, preferHome: boolean): Series {
  const [a, b] = [...d.teams.values()];
  const seeded = (t: SeriesTeam) => ({ ...t, seed: seedOf(t.teamId) });
  let top = seeded(a);
  let bottom = seeded(b);
  const swap = preferHome
    ? false
    : (top.seed ?? 99) > (bottom.seed ?? 99) || ((top.seed ?? 99) === (bottom.seed ?? 99) && top.teamId > bottom.teamId);
  if (swap) [top, bottom] = [bottom, top];

  const games = d.games
    .sort((x, y) => x.game.date.localeCompare(y.game.date))
    .map(({ game, label }): SeriesGame => ({ id: game.id, date: game.date, label, completed: game.completed, home: game.home, away: game.away, winnerId: winnerOf(game) }));
  const topWins = games.filter((g) => g.winnerId === top.teamId).length;
  const bottomWins = games.filter((g) => g.winnerId === bottom.teamId).length;
  const need = Math.ceil(d.bestOf / 2);
  const winnerId = topWins >= need ? top.teamId : bottomWins >= need ? bottom.teamId : undefined;

  let status: string;
  if (winnerId) {
    const w = winnerId === top.teamId ? top : bottom;
    const g = games[0];
    // A single game reads as the score, a series as the games won.
    status = d.bestOf === 1 && g
      ? `${w.abbr} wins ${Math.max(g.home.score ?? 0, g.away.score ?? 0)}-${Math.min(g.home.score ?? 0, g.away.score ?? 0)}`
      : `${w.abbr} wins ${Math.max(topWins, bottomWins)}-${Math.min(topWins, bottomWins)}`;
  } else if (topWins + bottomWins === 0) {
    status = games[0] ? `Starts ${dateLabel(games[0].date)}` : 'To be played';
  } else if (topWins === bottomWins) {
    status = `Series tied ${topWins}-${bottomWins}`;
  } else {
    const lead = topWins > bottomWins ? top : bottom;
    status = `${lead.abbr} leads ${Math.max(topWins, bottomWins)}-${Math.min(topWins, bottomWins)}`;
  }

  return { id: d.id, round: d.round, conference: d.conference, title: d.title, top, bottom, topWins, bottomWins, bestOf: d.bestOf, games, winnerId, status, order: 0 };
}

const side = (s: CupSide): SeriesTeam => ({ teamId: s.teamId, abbr: s.abbr, logo: s.logo });

/** Group games into one series per (round, pair of teams). */
function group(
  games: CupGame[],
  keyOf: (g: CupGame) => { round: RoundKey; conference?: Conf; label: string; title?: string; bestOf: number } | null,
): Draft[] {
  const drafts = new Map<string, Draft>();
  for (const game of games) {
    const k = keyOf(game);
    if (!k) continue;
    const pair = [game.home.teamId, game.away.teamId].sort().join('-');
    // A play-in game is its own "series"; everything else groups by the two teams.
    const id = k.bestOf === 1 ? game.id : `${k.round}:${pair}`;
    let d = drafts.get(id);
    if (!d) {
      d = { id, round: k.round, conference: k.conference, title: k.title, teams: new Map(), games: [], bestOf: k.bestOf };
      drafts.set(id, d);
    }
    d.teams.set(game.home.teamId, d.teams.get(game.home.teamId) ?? side(game.home));
    d.teams.set(game.away.teamId, d.teams.get(game.away.teamId) ?? side(game.away));
    d.games.push({ game, label: k.label });
  }
  return [...drafts.values()].filter((d) => d.teams.size === 2);
}

/** Order each round to line up with the one before it: a series sits beside the series its teams came from. */
function orderRounds(rounds: Series[][]): void {
  rounds[0]?.sort((a, b) => a.order - b.order);
  rounds[0]?.forEach((s, i) => (s.order = i));
  for (let r = 1; r < rounds.length; r++) {
    const prev = rounds[r - 1];
    for (const s of rounds[r]) {
      const feeders = prev.filter((p) => [p.top.teamId, p.bottom.teamId].some((id) => id === s.top.teamId || id === s.bottom.teamId));
      s.order = feeders.length ? feeders.reduce((sum, f) => sum + f.order, 0) / feeders.length : 99;
    }
    rounds[r].sort((a, b) => a.order - b.order);
    rounds[r].forEach((s, i) => (s.order = i));
  }
}

// ─── Playoffs ─────────────────────────────────────────────────────────────────

/** Conference seeds by team, from the regular-season standings. */
export function seedMap(standings: ConferenceStandings): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of [...standings.east, ...standings.west]) out[e.teamId] = e.seed;
  return out;
}

/** Where each first-round series sits in the bracket, top to bottom, by its top seed. */
const R1_SLOT: Record<number, number> = { 1: 0, 4: 1, 3: 2, 2: 3 };

/** One drawn bracket: columns of rounds left to right. `byConference` stacks East above West inside each column. */
export type BracketSection = { title: string; rounds: Round[]; byConference?: boolean };

export type Playoffs = { rounds: Round[]; sections: BracketSection[] };

export function buildPlayoffs(games: CupGame[], seeds: Record<string, number>): Playoffs {
  const drafts = group(games, (g) => {
    const p = parsePlayoffNote(g.stage);
    return p ? { round: p.round, conference: p.conference, label: p.game ? `Game ${p.game}` : 'Game', bestOf: 7 } : null;
  });

  // Seeds 7 and 8 come from the play-in, so they aren't in the standings' top six: they are the
  // opponents of seeds 1-6 (1 plays 8, 2 plays 7, 3 plays 6...), i.e. 9 minus the top seed.
  const seed = new Map<string, number>();
  for (const d of drafts.filter((x) => x.round === 'r1')) {
    const [a, b] = [...d.teams.keys()];
    const sa = seeds[a];
    const sb = seeds[b];
    if (sa != null && sa <= 6) {
      seed.set(a, sa);
      seed.set(b, 9 - sa);
    } else if (sb != null && sb <= 6) {
      seed.set(b, sb);
      seed.set(a, 9 - sb);
    }
  }
  const seedOf = (id: string) => seed.get(id) ?? seeds[id];

  const all = drafts.map((d) => finish(d, seedOf, false));
  const byRound = (r: RoundKey, conf?: Conf) => all.filter((s) => s.round === r && (!conf || s.conference === conf));

  const build = (conf: Conf) => {
    const rs = [byRound('r1', conf), byRound('r2', conf), byRound('r3', conf)];
    rs[0].forEach((s) => (s.order = R1_SLOT[s.top.seed ?? 0] ?? 9));
    orderRounds(rs);
    return rs;
  };
  const east = build('east');
  const west = build('west');
  const finals = byRound('finals');
  finals.forEach((s) => (s.order = 0));

  // One tree: East stacked above West, each round a column, and the Finals the last column, centered between the two
  // conference finals it grew out of.
  const key: RoundKey[] = ['r1', 'r2', 'r3'];
  const columns: Round[] = key
    .map((k, i): Round => ({ key: k, name: ROUND_NAMES[k], series: [...east[i], ...west[i]] }))
    .filter((r) => r.series.length > 0);
  if (finals.length) columns.push({ key: 'finals', name: ROUND_NAMES.finals, series: finals });
  const sections: BracketSection[] = columns.length ? [{ title: '', rounds: columns, byConference: true }] : [];

  const rounds: Round[] = (['r1', 'r2', 'r3', 'finals'] as RoundKey[])
    .map((k): Round => ({
      key: k,
      name: ROUND_NAMES[k],
      series: [...east, ...west].flat().concat(finals).filter((s) => s.round === k).sort((a, b) => (a.conference === b.conference ? a.order - b.order : a.conference === 'east' ? -1 : 1)),
    }))
    .filter((r) => r.series.length > 0);

  return { rounds, sections };
}

// ─── Play-in ──────────────────────────────────────────────────────────────────

const PLAYIN_ORDER = ['7th Place vs 8th Place', '9th Place vs 10th Place', '8th Seed Game'];
const playInIndex = (s: Series) => PLAYIN_ORDER.findIndex((t) => (s.title ?? '').startsWith(t.split(' ')[0]));

export type PlayIn = { rounds: Round[]; sections: BracketSection[] };

/**
 * The play-in as a real bracket, per conference: 7 vs 8 and 9 vs 10 first, then the loser of the first plays the winner
 * of the second for the 8th seed. `rounds` is the flat list for the Rounds view.
 */
export function buildPlayIn(games: CupGame[], seeds: Record<string, number>): PlayIn | null {
  const drafts = group(games, (g) => {
    const p = parsePlayInNote(g.stage);
    return p ? { round: 'playin', conference: p.conference, label: p.title, title: p.title, bestOf: 1 } : null;
  });
  const series = drafts.map((d) => finish(d, (id) => seeds[id], true));
  series.sort((a, b) => {
    if (a.conference !== b.conference) return a.conference === 'east' ? -1 : 1;
    return playInIndex(a) - playInIndex(b);
  });
  series.forEach((s, i) => (s.order = i));
  if (series.length === 0) return null;

  const sections = (['east', 'west'] as const).flatMap((conf): BracketSection[] => {
    const mine = series.filter((s) => s.conference === conf);
    const first = mine.filter((s) => playInIndex(s) < 2);
    const last = mine.filter((s) => playInIndex(s) === 2);
    const rounds = ([
      { key: 'playin', name: 'First games', series: first },
      { key: 'playin-final', name: '8th seed game', series: last },
    ] satisfies Round[]).filter((r) => r.series.length > 0);
    return rounds.length ? [{ title: conf === 'east' ? 'East' : 'West', rounds }] : [];
  });
  return { rounds: [{ key: 'playin', name: ROUND_NAMES.playin, series }], sections };
}

// ─── NBA Cup knockout ─────────────────────────────────────────────────────────

const CUP_ROUND: Record<string, RoundKey> = { quarterfinals: 'cup-qf', semifinals: 'cup-sf', championship: 'cup-final', final: 'cup-final', finals: 'cup-final' };

export function buildCupBracket(knockout: CupGame[], conferenceOf: Record<string, Conf | undefined> = {}): Round[] {
  const drafts = group(knockout, (g) => {
    const round = CUP_ROUND[g.stage.toLowerCase()];
    return round ? { round, label: g.stage, bestOf: 1 } : null;
  });
  const all = drafts.map((d) => finish(d, () => undefined, true));
  const keys: RoundKey[] = ['cup-qf', 'cup-sf', 'cup-final'];
  const rs = keys.map((k) => all.filter((s) => s.round === k));
  // Quarterfinals: East pairings first, then West, so the bracket reads as two halves.
  rs[0].forEach((s) => {
    s.conference = conferenceOf[s.top.teamId];
    s.order = (s.conference === 'west' ? 100 : 0) + Date.parse(s.games[0]?.date ?? '') / 1e11;
  });
  orderRounds(rs);
  return keys.map((k, i): Round => ({ key: k, name: ROUND_NAMES[k], series: rs[i] })).filter((r) => r.series.length > 0);
}

// ─── Tree layout ──────────────────────────────────────────────────────────────

export type Placement = { series: Series; col: number; y: number };

/**
 * Positions for a bracket drawn left to right: the first round is evenly stacked and every later series
 * is centered between the series it grew out of.
 */
export function layoutTree(
  rounds: Round[],
  cardH: number,
  gap: number,
  opts: { confGap?: number; top?: number } = {},
): { placements: Placement[]; height: number } {
  const { confGap = 0, top = 0 } = opts;
  const placements: Placement[] = [];
  const yById = new Map<string, number>();
  rounds.forEach((round, col) => {
    // Extra room where the first round switches conference (East above, West below).
    let extra = 0;
    round.series.forEach((s, i) => {
      let y: number;
      if (col === 0) {
        if (i > 0 && s.conference !== round.series[i - 1].conference) extra += confGap;
        y = top + i * (cardH + gap) + extra;
      } else {
        const feeders = rounds[col - 1].series.filter((p) => [p.top.teamId, p.bottom.teamId].some((id) => id === s.top.teamId || id === s.bottom.teamId));
        const ys = feeders.map((f) => yById.get(f.id)).filter((v): v is number => v != null);
        y = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : top + i * (cardH + gap) * 2 ** col;
      }
      yById.set(s.id, y);
      placements.push({ series: s, col, y });
    });
  });
  const height = placements.reduce((m, p) => Math.max(m, p.y + cardH), 0);
  return { placements, height };
}

/**
 * A short tag for a playoff or play-in game's note, for the game card and the game page: "West Finals - Game 2" -> "WCF · G2",
 * "East 1st Round - Game 3" -> "R1 · G3", "NBA Finals - Game 4" -> "FINALS · G4", a play-in game -> "PLAY-IN". Null for any other note.
 */
export function playoffTag(note?: string | null): string | null {
  if (!note) return null;
  if (/play-in/i.test(note)) return 'PLAY-IN';
  const p = parsePlayoffNote(note);
  if (!p) return null;
  const round = p.round === 'r1' ? 'R1' : p.round === 'r2' ? 'SEMIS' : p.round === 'finals' ? 'FINALS' : p.conference === 'east' ? 'ECF' : 'WCF';
  return p.game ? `${round} · G${p.game}` : round;
}

/**
 * Each team's playoff seed, from the series of a season's playoffs (so the 7 and 8 seeds, which come from the play-in, are right too).
 * `standingsSeeds` are the regular-season conference seeds (`seedMap`). Teams that did not make it are not in it.
 */
export function playoffSeeds(games: CupGame[], standingsSeeds: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const round of buildPlayoffs(games, standingsSeeds).rounds) {
    for (const series of round.series) {
      for (const team of [series.top, series.bottom]) if (team.seed != null) out[team.teamId] = team.seed;
    }
  }
  return out;
}
