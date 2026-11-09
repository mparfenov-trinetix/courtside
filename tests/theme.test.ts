import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { contrast, ensureContrast, teamTheme } from '../src/lib/theme';

// All 30 teams as ESPN lists them (name, color, alternateColor), recorded so the test needs no network.
const TEAMS: { abbreviation: string; color: string; alternateColor: string }[] = JSON.parse(
  readFileSync(new URL('./fixtures/team-colors.json', import.meta.url), 'utf8'),
);

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const apart = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

test('contrast: black on white is 21, a color against itself is 1, and ensureContrast only moves a color that needs it', () => {
  assert.ok(Math.abs(contrast('#000000', '#FFFFFF') - 21) < 0.01);
  assert.ok(Math.abs(contrast('#336699', '#336699') - 1) < 0.001);
  assert.equal(ensureContrast('#FFFFFF', '#000000', 4.5), '#FFFFFF');
  const lifted = ensureContrast('#98002E', '#0A0A12', 4.5);
  assert.notEqual(lifted, '#98002E');
  assert.ok(contrast(lifted, '#0A0A12') >= 4.5);
});

test('team themes: all 30 teams are covered', () => {
  assert.equal(TEAMS.length, 30);
});

test('team themes: accent text reads on every team page (4.5:1), and brand keeps the team color for fills', () => {
  for (const t of TEAMS) {
    const th = teamTheme(t as never);
    assert.ok(contrast(th.accent, th.background) >= 4.5, `${t.abbreviation}: accent ${contrast(th.accent, th.background).toFixed(2)}`);
    // Lifting only ever lightens a team's own bright color toward white: a color that already read is left exactly as it is.
    if (contrast(th.brand, th.background) >= 4.5) assert.equal(th.accent, th.brand, `${t.abbreviation}: a readable accent is untouched`);
  }
});

test('team themes: text on the card reads (3:1 or better, the large-text bar the card names are set at)', () => {
  for (const t of TEAMS) {
    const th = teamTheme(t as never);
    assert.ok(contrast(th.onPrimary, th.primary) >= 3, `${t.abbreviation}: ${contrast(th.onPrimary, th.primary).toFixed(2)}`);
  }
});

test('team themes: the stripe is visible against the card (by lightness or by hue)', () => {
  for (const t of TEAMS) {
    const th = teamTheme(t as never);
    assert.ok(apart(th.stripe, th.primary) >= 90 || contrast(th.stripe, th.primary) >= 2.2, `${t.abbreviation}: stripe ${th.stripe} on ${th.primary}`);
  }
});

test('team themes: a card that is close to its page color gets an edge that shows against both', () => {
  for (const t of TEAMS) {
    const th = teamTheme(t as never);
    if (contrast(th.primary, th.background) >= 3) continue; // it stands off the page by itself
    const worst = Math.min(contrast(th.edge, th.primary), contrast(th.edge, th.background));
    assert.ok(worst >= 3, `${t.abbreviation}: edge ${th.edge} worst side ${worst.toFixed(2)}`);
  }
});

test('team themes: no team is the neutral fallback', () => {
  const none = teamTheme(null);
  for (const t of TEAMS) assert.notEqual(teamTheme(t as never).primary, none.primary);
});

test('team themes: the same two colors give the very same object (worked out once), and no team has its own', () => {
  const [a, b] = TEAMS;
  assert.equal(teamTheme(a as never), teamTheme({ color: a.color, alternateColor: a.alternateColor }));
  assert.notEqual(teamTheme(a as never), teamTheme(b as never));
  assert.equal(teamTheme(null), teamTheme(undefined));
});
