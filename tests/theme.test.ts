import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { contrast, ensureContrast, logoOn, ratingTone, teamTheme } from '../src/lib/theme';

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

test('team themes: no two teams share a card color, and the groups that did are told apart', () => {
  const card = (abbr: string) => teamTheme(TEAMS.find((t) => t.abbreviation === abbr) as never).primary;
  // ESPN gave the Pistons, Knicks and 76ers one royal blue, the Pacers, Nuggets and Pelicans one navy, the Nets and Spurs one black;
  // the 76ers keep ESPN's blue, the Hawks' red was the Rockets' and the Raptors' was the Bulls'.
  const groups = [['DET', 'NY', 'PHI'], ['IND', 'DEN'], ['IND', 'NO'], ['BKN', 'SA'], ['LAL', 'SAC'], ['WSH', 'DET'], ['GS', 'IND'], ['ATL', 'HOU', 'POR'], ['CHI', 'TOR']];
  for (const g of groups) {
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) assert.ok(apart(card(g[i]), card(g[j])) >= 40, `${g[i]} and ${g[j]} are ${Math.round(apart(card(g[i]), card(g[j])))} apart`);
    }
  }
  // The Pelicans' navy and the Nuggets' are the same family, so the cards are only a shade apart: their stripes (red against gold) and
  // accents are what tell them apart.
  const theme = (abbr: string) => teamTheme(TEAMS.find((t) => t.abbreviation === abbr) as never);
  assert.ok(apart(card('NO'), card('DEN')) >= 20, 'NO and DEN cards');
  assert.ok(apart(theme('NO').stripe, theme('DEN').stripe) >= 100, 'NO and DEN stripes');
  assert.ok(apart(theme('NO').accent, theme('DEN').accent) >= 100, 'NO and DEN accents');
  const all = TEAMS.map((t) => teamTheme(t as never).primary.toLowerCase());
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) assert.notEqual(all[i], all[j], `${TEAMS[i].abbreviation} and ${TEAMS[j].abbreviation} share ${all[i]}`);
});

test('team themes: a light card (the Pacers, Spurs, Warriors) takes dark text, a dark one white', () => {
  for (const abbr of ['IND', 'SA', 'GS']) assert.equal(teamTheme(TEAMS.find((t) => t.abbreviation === abbr) as never).onPrimary, '#0A0A0A', abbr);
  for (const abbr of ['BKN', 'NO', 'MIA', 'DET', 'WSH', 'DEN', 'ATL', 'NY', 'TOR']) assert.equal(teamTheme(TEAMS.find((t) => t.abbreviation === abbr) as never).onPrimary, '#FFFFFF', abbr);
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

test('rating colors: red under 6, orange, green, light blue, then solid blue, by the rating as shown', () => {
  const bg = (r: number) => ratingTone(r).background;
  // The scale's own red and green (not the app's loss and win colors).
  const RED = '#B22222';
  const GREEN = '#00A86B';
  assert.equal(bg(1), RED);
  assert.equal(bg(5.9), RED);
  // 5.96 is shown as 6.0, so it takes 6.0's color.
  assert.equal(bg(5.96), bg(6));
  assert.notEqual(bg(6), RED);
  const bands = [3, 6.5, 7.5, 8.5, 9.5].map(bg);
  assert.equal(new Set(bands).size, 5, 'five different colors');
  assert.equal(bg(6), bg(6.9));
  assert.equal(bg(7), GREEN);
  assert.equal(bg(7.9), GREEN);
  assert.equal(bg(8), bg(8.9));
  assert.equal(bg(9), bg(10));
  assert.notEqual(bg(8.9), bg(9));
});

test('rating colors: the number on every square is white', () => {
  for (let r = 1; r <= 10; r += 0.5) assert.equal(ratingTone(r).text, '#FFFFFF');
});

test('logos: the Raptors wear their own red logo on their charcoal card, every other white-text team the dark-background one', () => {
  const logos = { logo: 'full.png', logoDark: 'dark.png', logoOnPrimary: 'onprimary.png' };
  assert.equal(logoOn({ ...logos, abbreviation: 'TOR' }, '#FFFFFF'), 'full.png');
  assert.equal(logoOn({ ...logos, abbreviation: 'MIA' }, '#FFFFFF'), 'onprimary.png');
  assert.equal(logoOn({ ...logos, abbreviation: 'IND' }, '#0A0A0A'), 'full.png');
  assert.equal(logoOn(logos, '#FFFFFF'), 'onprimary.png');
});
