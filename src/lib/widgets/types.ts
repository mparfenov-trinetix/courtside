import type { Team } from '@/lib/espn';

/** The colors a widget is dressed in, from the team's theme. */
export type WidgetTheme = { background: string; surface: string; accent: string };

/** What a widget needs to know about a team. */
export type TeamLike = Pick<Team, 'abbreviation' | 'name' | 'logo' | 'logoDark'>;

/** Everything the widget shows, already formatted by the app: the widget itself can't fetch or compute. */
export type NextGameProps = {
  /** The selected team. */
  teamAbbr: string;
  teamName: string;
  record: string;
  /** The app's own look: dark team-tinted background (top-left to bottom-right) and the team's accent. */
  bg: string;
  bg2: string;
  accent: string;
  /** Logo file URIs inside the shared widget folder; empty when a logo couldn't be downloaded. */
  logo: string;
  oppLogo: string;
  /** The next fixture; `iso` is empty when the team has no game scheduled. */
  oppAbbr: string;
  oppName: string;
  home: boolean;
  iso: string;
  /** "Thu, Nov 5" in the device's language. */
  day: string;
  /** Between tip-off and the end of the game: the widget turns red and sends you to the live game. */
  live: boolean;
  gameId: string;
  /** For the footer: stage like "NBA Cup" or "Round 1", when there is one. */
  tag: string;
  /** The score while the game is on (the selected team's first, as the logos are) and its clock ("4:03 - 3rd"); empty before the app has one. */
  myScore: string;
  oppScore: string;
  clock: string;
  /** Only the gallery sample sets these: fixed text in place of the live clock, which a sample can't have. */
  timeText?: string;
  countdownText?: string;
};

export type FormGameProps = {
  result: 'W' | 'L';
  /** Opponent abbreviation. */
  opp: string;
  /** "106-93": the team's score first. */
  score: string;
  home: boolean;
};

/** Everything the widget shows, already worked out by the app. */
export type TeamFormProps = {
  teamAbbr: string;
  teamName: string;
  record: string;
  /** "4th in Pacific Division"; empty when unknown. */
  standing: string;
  /** "W3" / "L2"; empty with no games. */
  streak: string;
  bg: string;
  bg2: string;
  accent: string;
  /** Logo file URI inside the shared widget folder; empty when it couldn't be downloaded. */
  logo: string;
  /** Last five finished games, oldest first. */
  games: FormGameProps[];
  /** The team's best player (ESPN's own rating): "N. Jokic", his headshot file and per-game numbers; all empty when unknown. */
  starName: string;
  starAvatar: string;
  starPpg: string;
  starRpg: string;
  starApg: string;
};

export type FixtureProps = {
  oppAbbr: string;
  oppName: string;
  /** Logo file URI inside the shared widget folder; empty when it couldn't be downloaded. */
  oppLogo: string;
  home: boolean;
  /** "Thu, Nov 5" and "7:00 PM", in the device's language and time zone when the app last synced. */
  day: string;
  time: string;
  /** "NBA Cup" or a playoff round; empty for a regular game. */
  tag: string;
  gameId: string;
};

export type FixturesProps = {
  teamAbbr: string;
  bg: string;
  bg2: string;
  accent: string;
  logo: string;
  /** The next games, soonest first. */
  games: FixtureProps[];
};

/** Everything the Lock Screen widget shows, already worked out by the app. */
export type LockScreenProps = {
  teamAbbr: string;
  /** "4-2"; empty when unknown. */
  record: string;
  /** "W3" / "L2"; empty with no games. */
  streak: string;
  /** The last five results, oldest first, as "W" / "L". */
  form: string[];
  /** "W 112-104 @ LAL" for the latest finished game; empty with none. */
  last: string;
  /** The next game; `oppAbbr` is empty when none is scheduled. */
  oppAbbr: string;
  home: boolean;
  /** "Thu 7:00 PM" and just "7:00 PM", in the device's language and time zone. */
  when: string;
  time: string;
  gameId: string;
};

export type WatchlistGameProps = {
  away: string;
  home: string;
  /** Logo file URIs inside the shared widget folder; empty when one couldn't be downloaded (the abbreviation shows instead). */
  awayLogo: string;
  homeLogo: string;
  /** The two teams' colors for the game-card look (`matchupColors`), '#RRGGBB'; empty when a team isn't known. */
  awayColor: string;
  homeColor: string;
  /** Empty before tip-off. */
  awayScore: string;
  homeScore: string;
  /** "Q4 3:12", "Final", or the start time ("Thu 7:00 PM"). */
  status: string;
  live: boolean;
};

export type WatchlistPlayerProps = {
  name: string;
  /** Headshot file URI inside the shared widget folder; empty when it couldn't be downloaded. */
  avatar: string;
  /** "28 pts · 7 reb · 5 ast" from his latest game. */
  line: string;
  /** The same three numbers on their own, for the layouts that give each a column. */
  pts: string;
  reb: string;
  ast: string;
  /** "W 112-104" for that game. */
  result: string;
};

export type WatchlistProps = {
  games: WatchlistGameProps[];
  players: WatchlistPlayerProps[];
};
