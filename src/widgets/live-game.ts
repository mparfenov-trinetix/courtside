import { involvesTeam, type GameSummary, type ScoreboardGame } from '@/lib/espn';
import { timeoutLabel } from '@/lib/game';
import { matchupColors, mix, palette } from '@/lib/theme';

/**
 * Everything the Live Activity (lock screen banner and Dynamic Island) shows, already worked out by the app: the
 * activity's layout runs in its own runtime and can't compute or fetch anything. Plain values only.
 */
export type LiveGameProps = {
  gameId: string;
  awayAbbr: string;
  homeAbbr: string;
  awayScore: string;
  homeScore: string;
  /** Logo file URIs inside the shared widget folder; empty when a logo couldn't be downloaded. */
  awayLogo: string;
  homeLogo: string;
  /** "8:13 - 4th", "Halftime" or "Final". */
  status: string;
  /** "NOP TO" while a timeout is on; empty otherwise. */
  timeout: string;
  final: boolean;
  awayLeads: boolean;
  homeLeads: boolean;
  /** Each side's team color, as in the game page. */
  awayColor: string;
  homeColor: string;
  /** The team color washed into the dark page, for the banner's two halves; and a lighter one that reads as text on black. */
  awayBg: string;
  homeBg: string;
  awayText: string;
  homeText: string;
  /** The team is in the bonus this period: the other side's fouls now send it to the line. */
  awayBonus: boolean;
  homeBonus: boolean;
};

/** What the activity shows before the first update (and in previews). */
export const SAMPLE_LIVE_GAME: LiveGameProps = {
  gameId: '',
  awayAbbr: 'PHI',
  homeAbbr: 'DET',
  awayScore: '53',
  homeScore: '42',
  awayLogo: '',
  homeLogo: '',
  status: '1:05 - 2nd',
  timeout: '',
  final: false,
  awayLeads: true,
  homeLeads: false,
  awayColor: '#ED174C',
  homeColor: '#1D42BA',
  awayBg: '#5A1426',
  homeBg: '#14285E',
  awayText: '#F5738F',
  homeText: '#6B8DE0',
  awayBonus: false,
  homeBonus: false,
};

/** Pure: a game summary (live or just ended) as the activity's props. `logos` maps a logo URL to its shared file. */
export function buildLiveGameProps(game: GameSummary, logos: Record<string, string> = {}): LiveGameProps {
  const { away, home } = game;
  const colors = matchupColors(away.team, home.team);
  const logoOf = (t: GameSummary['away']['team']) => logos[t.logoDark || t.logo] ?? '';
  return {
    gameId: game.id,
    awayAbbr: away.team.abbreviation,
    homeAbbr: home.team.abbreviation,
    awayScore: String(away.score),
    homeScore: String(home.score),
    awayLogo: logoOf(away.team),
    homeLogo: logoOf(home.team),
    status: game.completed ? 'Final' : game.status,
    timeout: timeoutLabel(game.plays, game.live, [away, home]) ?? '',
    final: game.completed,
    awayLeads: away.score > home.score,
    homeLeads: home.score > away.score,
    awayColor: colors.away,
    homeColor: colors.home,
    awayBg: mix(palette.arena, colors.away, 0.5),
    homeBg: mix(palette.arena, colors.home, 0.5),
    awayText: mix(colors.away, '#FFFFFF', 0.4),
    homeText: mix(colors.home, '#FFFFFF', 0.4),
    // Only while the game is on: the foul count of a finished game is history.
    awayBonus: game.live && !!away.fouls?.bonus,
    homeBonus: game.live && !!home.fouls?.bonus,
  };
}

/** Whether the activity should be running for this game: on now (not paused for a postponement, not yet over). */
export const isTrackable = (game: Pick<GameSummary, 'live' | 'completed'>) => game.live && !game.completed;

/**
 * Which game the Live Activity should follow: your team's game while it is on, else a starred game that is on; once
 * nothing is on, a finished one from today (so its final score is put up before the activity ends).
 */
export function pickTrackedGame(board: ScoreboardGame[] | undefined, favoriteTeamId: string | null, starred: string[]): string | null {
  if (!board) return null;
  const mine = (g: ScoreboardGame) => involvesTeam(g, favoriteTeamId) || starred.includes(g.id);
  const rank = (g: ScoreboardGame) => (involvesTeam(g, favoriteTeamId) ? 0 : 1);
  const candidates = board.filter(mine).sort((a, b) => rank(a) - rank(b));
  return (candidates.find((g) => g.inProgress) ?? candidates.find((g) => g.completed))?.id ?? null;
}
