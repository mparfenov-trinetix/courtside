import type { Team } from './espn';

/** Base palette used before a team is chosen and for neutral chrome. */
export const palette = {
  arena: '#0D1B2E', // deep arena blue, app background
  arenaRaised: '#16273F',
  maple: '#E2B077', // hardwood floor, used sparingly for court lines
  chalk: '#F2F4F7', // primary text
  muted: '#8A96A8', // secondary text
  line: 'rgba(242,244,247,0.12)',
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

export type TeamTheme = {
  primary: string;
  secondary: string;
  background: string; // screen background, a dark wash of the primary
  surface: string;
  onPrimary: string; // readable text on primary
  accent: string; // the brighter of the two team colors, for highlights on dark bg
};

export function teamTheme(team?: Pick<Team, 'color' | 'alternateColor'> | null): TeamTheme {
  if (!team) {
    return {
      primary: palette.arenaRaised,
      secondary: palette.maple,
      background: palette.arena,
      surface: palette.arenaRaised,
      onPrimary: palette.chalk,
      accent: palette.maple,
    };
  }
  const primary = team.color;
  // Some teams list near-identical colors; fall back to a lifted primary.
  const secondary =
    distance(team.alternateColor, primary) < 60 ? mix(primary, '#FFFFFF', 0.45) : team.alternateColor;
  const accent = luminance(primary) > luminance(secondary) ? primary : secondary;
  return {
    primary,
    secondary,
    background: mix(primary, '#05080D', luminance(primary) > 0.4 ? 0.86 : 0.74),
    surface: mix(primary, '#05080D', 0.62),
    onPrimary: luminance(primary) > 0.45 ? '#0A0A0A' : '#FFFFFF',
    accent: luminance(accent) < 0.03 ? mix(accent, '#FFFFFF', 0.6) : accent,
  };
}

/** Pick the logo variant that reads on a background with the given text color. */
export function logoOn(team: Pick<Team, 'logo' | 'logoDark'>, onColor: string) {
  return onColor === '#FFFFFF' ? team.logoDark || team.logo : team.logo;
}
