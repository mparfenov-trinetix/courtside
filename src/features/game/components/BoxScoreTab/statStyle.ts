import { COL_W, type Col } from '@/lib/game';
import { fonts, palette, withAlpha } from '@/lib/theme';

/** The look of one stat value: right-aligned in its column, a big scoring night white and bold, four turnovers or more red, plus-minus green or red. */
export function statStyle(col: Col, value?: string, fontSize = 13, width: number = COL_W[col]): object[] {
  const base = { width, textAlign: 'right' as const, fontFamily: fonts.bodySemi, fontSize };
  const num = value != null ? parseInt(value, 10) : NaN;
  const pts = col === 'PTS' && num >= 20;
  const to = col === 'TO' && num >= 4;
  const pm = col === '+/-' && !isNaN(num) && num !== 0;
  const color = pts ? palette.chalk : to ? palette.loss : pm ? (num > 0 ? palette.win : palette.loss) : withAlpha(palette.chalk, 0.75);
  return [base, { color, fontFamily: pts || to ? fonts.bodyBold : fonts.bodySemi }];
}
