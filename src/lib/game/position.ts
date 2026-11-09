const NAMES: Record<string, string> = {
  PG: 'Point Guard',
  SG: 'Shooting Guard',
  SF: 'Small Forward',
  PF: 'Power Forward',
  G: 'Guard',
  F: 'Forward',
  C: 'Center',
  GF: 'Guard-Forward',
  FC: 'Forward-Center',
};

/**
 * A position written out: "G" is "Guard", "F-C" or "FC" is "Forward-Center", "PG" is "Point Guard". Anything it does not know (ESPN says "NA" for
 * the early years) is returned as it came, and nothing at all is nothing.
 */
export function positionName(abbr?: string): string | undefined {
  const text = abbr?.trim();
  if (!text) return undefined;
  const whole = NAMES[text.toUpperCase().replace(/[-/]/g, '')];
  if (whole) return whole;
  const parts = text.split(/[-/]/).map((p) => NAMES[p.trim().toUpperCase()]);
  return parts.every(Boolean) ? parts.join('-') : text;
}
