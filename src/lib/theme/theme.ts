import type { Team } from '@/lib/espn';

/** Base palette used before a team is chosen and for neutral chrome. */
export const palette = {
  arena: '#0D1B2E', // deep arena blue, app background
  arenaRaised: '#16273F',
  maple: '#E2B077', // hardwood floor, used sparingly for court lines
  chalk: '#F2F4F7', // primary text
  muted: '#8A96A8', // secondary text
  line: 'rgba(242,244,247,0.12)',
  // Meaning, not hue: the same colors say win / loss / live / best everywhere. (`live` is the win green: a live dot and a win are both "go".)
  win: '#34D399',
  loss: '#F87171',
  gold: '#FBBF24', // titles, the bonus, a starred thing, a best value
};

export const fonts = {
  display: 'BigShouldersDisplay_900Black',
  displayBold: 'BigShouldersDisplay_700Bold',
  body: 'Barlow_500Medium',
  bodySemi: 'Barlow_600SemiBold',
  bodyBold: 'Barlow_700Bold',
};

type RGB = [number, number, number];

function toRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

function toHex([r, g, b]: RGB) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Mix `a` toward `b` by `amount` (0 = a, 1 = b). */
export function mix(a: string, b: string, amount: number) {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return toHex(ca.map((v, i) => v + (cb[i] - v) * amount) as RGB);
}

export function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function saturation(hex: string) {
  const [r, g, b] = toRgb(hex);
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
}

export function luminance(hex: string) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function distance(a: string, b: string) {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
}

/** WCAG contrast ratio between two colors (1 = identical, 21 = black on white). */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * `color` itself if it already reads against `against` at `min`:1, else the nearest shade of it that does: lifted toward white on
 * a dark background, darkened toward black on a light one (white or black if even that is not enough).
 */
export function ensureContrast(color: string, against: string, min: number) {
  if (contrast(color, against) >= min) return color;
  const toward = luminance(against) > 0.5 ? '#000000' : '#FFFFFF';
  for (let step = 1; step <= 20; step++) {
    const shade = mix(color, toward, step / 20);
    if (contrast(shade, against) >= min) return shade;
  }
  return toward;
}

export type TeamTheme = {
  primary: string;
  secondary: string;
  background: string; // screen background, a dark wash of the primary
  surface: string;
  onPrimary: string; // text on primary: white, or near-black when that reads clearly better
  /**
   * The team's own bright color for fills and graphics (bars, dots, washes). Not safe for small text: on a dark team page it can be
   * as dim as 2:1. Use `accent` for anything you read.
   */
  brand: string;
  /** `brand` lifted until it reads on the team's page at 4.5:1 or better: for numbers, labels, links, icons, the tab underline. */
  accent: string;
  /** The team stripe on a card: the secondary color, or a shade of it that stays visible against the primary. */
  stripe: string;
  /**
   * A line along a team-colored surface that shows against both the card and the page behind it: whichever of the secondary
   * color, `onPrimary` and white has the best worst case (a black team's card is otherwise lost against its own page).
   */
  edge: string;
};

/**
 * ESPN's two colors per team, replaced for the nine teams whose look would otherwise be another team's (the key is ESPN's pair, lower case,
 * so it works for a team from any feed; a team whose ESPN colors change falls back to them). Three teams were the very same royal blue (the
 * Pistons, Knicks and 76ers), the Pacers, Nuggets and Pelicans the very same navy (the Nuggets kept it), the Nets and Spurs the very same black. Each now keeps
 * to colors the club really wears, and every card, page and accent in the app follows it:
 * Pacers lemon gold with navy, Pelicans a dark dirty gold with navy (the Nuggets keep ESPN's navy with gold), Knicks orange with blue, Spurs silver with black, 76ers a bright blue, Pistons a deep
 * royal blue, Wizards a vivid blue with red (they were a red like four other teams), Kings a lighter violet (the Lakers' purple to the digit),
 * Hawks keep their red but wear the volt green of their own rebrand in place of the gold the Warriors and Lakers wear.
 * The cards were chosen to be at least 16 apart in CIE Lab from every other card (ESPN's were 0 for three pairs; 3 to 11 for six more).
 */
const TEAM_PALETTE: Record<string, { color: string; alternateColor: string }> = {
  '#0c2340|#ffd520': { color: '#FFDC4A', alternateColor: '#0C2340' }, // Pacers
  '#0a2240|#b4975a': { color: '#957F2C', alternateColor: '#0A2240' }, // Pelicans: a dark, dirty gold (the Nuggets keep ESPN's navy and gold)
  '#1d428a|#f58426': { color: '#E8711A', alternateColor: '#006BB6' }, // Knicks (a shade deeper than their orange so white text reads on it, 3.1:1)
  '#000000|#c4ced4': { color: '#C4CED4', alternateColor: '#000000' }, // Spurs
  '#1d428a|#c8102e': { color: '#0B2A66', alternateColor: '#C8102E' }, // Pistons
  '#e31837|#002b5c': { color: '#1226B7', alternateColor: '#E31837' }, // Wizards
  '#5a2d81|#6a7a82': { color: '#7F39B0', alternateColor: '#6A7A82' }, // Kings
  '#d91244|#000000': { color: '#3A3A42', alternateColor: '#D91244' }, // Raptors: ESPN's red was the Bulls' to 3.9 in Lab, and no free red is left, so charcoal with the red as the accent
  '#c8102e|#fdb927': { color: '#F8210C', alternateColor: '#FDB927' }, // Hawks
};

/** The two colors a team is drawn in: its entry in `TEAM_PALETTE`, else ESPN's own. */
export function teamColors(team: Pick<Team, 'color' | 'alternateColor'>): { color: string; alternateColor: string } {
  return TEAM_PALETTE[`${team.color}|${team.alternateColor}`.toLowerCase()] ?? { color: team.color, alternateColor: team.alternateColor };
}

function computeTheme(source?: Pick<Team, 'color' | 'alternateColor'> | null): TeamTheme {
  const team = source ? teamColors(source) : null;
  if (!team) {
    return {
      primary: palette.arenaRaised,
      secondary: palette.maple,
      background: palette.arena,
      surface: palette.arenaRaised,
      onPrimary: palette.chalk,
      brand: palette.maple,
      accent: palette.maple,
      stripe: palette.maple,
      edge: palette.chalk,
    };
  }
  const primary = team.color;
  // Some teams list near-identical colors; fall back to a lifted primary.
  const secondary =
    distance(team.alternateColor, primary) < 60 ? mix(primary, '#FFFFFF', 0.45) : team.alternateColor;
  let brand = luminance(primary) > luminance(secondary) ? primary : secondary;
  // The brighter color isn't always the team's color: the Kings' purple loses to a grey alternate. When the
  // brighter one is washed out and the primary is the vivid one, keep the primary (lifted if it's too dark).
  if (brand === secondary && saturation(secondary) < 0.3 && saturation(primary) > 0.35) {
    brand = luminance(primary) < 0.08 ? mix(primary, '#FFFFFF', 0.3) : primary;
  }
  if (luminance(brand) < 0.03) brand = mix(brand, '#FFFFFF', 0.6);
  // Text on the card is white unless the card is light: past a luminance of 0.30 white falls under 3:1 and near-black takes over.
  const onPrimary = luminance(primary) > 0.3 ? '#0A0A0A' : '#FFFFFF';
  const background = mix(primary, '#05080D', luminance(primary) > 0.4 ? 0.86 : 0.74);

  // The stripe may differ from the primary by hue rather than lightness (the Thunder's orange on blue has a 1.2:1 ratio and is
  // plain to see): it is only changed when the two are close in both.
  const stripe =
    distance(secondary, primary) >= 110 || contrast(secondary, primary) >= 2.2 ? secondary : ensureContrast(secondary, primary, 2.5);

  // The edge: the secondary when it holds up against both card and page (it keeps the team's look), else the candidate whose
  // worse side is best.
  const worst = (c: string) => Math.min(contrast(c, primary), contrast(c, background));
  const edge = worst(secondary) >= 3 ? secondary : [onPrimary, '#FFFFFF', secondary].reduce((best, c) => (worst(c) > worst(best) ? c : best));

  return {
    primary,
    secondary,
    background,
    surface: mix(primary, '#05080D', 0.62),
    onPrimary,
    brand,
    accent: ensureContrast(brand, background, 4.5),
    stripe,
    edge,
  };
}

let noTeamTheme: TeamTheme | undefined;
const themes = new Map<string, TeamTheme>();

/**
 * A team's colors (see `computeTheme`). Worked out once per pair of ESPN colors and handed out again: the contrast search behind `accent`,
 * `stripe` and `edge` is colour math, and a screen asks for it per pill, row and card (over a hundred times to open Teams).
 * The object is shared, so it must not be changed.
 */
export function teamTheme(team?: Pick<Team, 'color' | 'alternateColor'> | null): TeamTheme {
  if (!team) return (noTeamTheme ??= computeTheme(null));
  const key = `${team.color}|${team.alternateColor}`;
  let theme = themes.get(key);
  if (!theme) {
    theme = computeTheme(team);
    themes.set(key, theme);
  }
  return theme;
}

/**
 * Two team colors that stay distinguishable on a dark background, for charts
 * and head-to-head bars where both teams share one canvas.
 */
export function matchupColors(
  away: Pick<Team, 'color' | 'alternateColor'>,
  home: Pick<Team, 'color' | 'alternateColor'>,
): { away: string; home: string } {
  const a = teamTheme(away).accent;
  const h = teamTheme(home).accent;
  if (distance(a, h) >= 110) return { away: a, home: h };

  const lift = (c: string) => (luminance(c) < 0.08 ? mix(c, '#FFFFFF', 0.45) : c);
  const own = teamColors(home);
  const candidates = [own.color, own.alternateColor, mix(own.color, '#FFFFFF', 0.35)]
    .map(lift)
    .sort((x, y) => distance(y, a) - distance(x, a));
  return { away: a, home: candidates[0] };
}

/** Pick the logo variant that reads on a background with the given text color. */
export function logoOn(team: Pick<Team, 'logo' | 'logoDark' | 'logoOnPrimary'>, onColor: string) {
  return onColor === '#FFFFFF' ? team.logoOnPrimary || team.logoDark || team.logo : team.logo;
}

/** Teams whose logo is the same red as their card (the logo variant for dark backgrounds has a red body), so it needs a white outline. */
export const OUTLINED_LOGO = new Set(['HOU']);
/** Outline thickness as a fraction of the logo size. */
export const OUTLINE = 0.012;
/** The eight directions a white copy of the logo is nudged in to draw its outline. */
export const OUTLINE_STEPS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
