import assert from 'node:assert/strict';
import test from 'node:test';

import { eraColorsFor, eraIn, eraLogoFor, registerEraLogos, renamedSince, teamAsItWas, teamEras, teamInSeason, withEraLogo, type Team } from '../src/lib/espn';

const okc = {
  id: '25',
  abbreviation: 'OKC',
  location: 'Oklahoma City',
  name: 'Thunder',
  displayName: 'Oklahoma City Thunder',
  color: '007ac1',
  alternateColor: 'ef3b24',
  logo: 'okc.png',
  logoDark: 'okc-dark.png',
  logoOnPrimary: 'okc-on.png',
  mark: 'okc-mark.png',
} as Team;

test('the Sonics became the Thunder in 2008-09 (season 2009)', () => {
  assert.equal(eraIn('25', 2008)?.name, 'Seattle SuperSonics');
  assert.equal(eraIn('25', 2009)?.name, 'Oklahoma City Thunder');
  assert.equal(eraIn('25', 2027)?.current, true);
  assert.equal(eraIn('25', 2008)?.to, 2008);
  assert.equal(renamedSince('25', 2003), true);
  assert.equal(renamedSince('25', 2015), false);
});

test('the Nets, Grizzlies, Wizards, Bobcats and the Hornets chain keep their ids', () => {
  assert.equal(eraIn('17', 2012)?.abbr, 'NJ');
  assert.equal(eraIn('17', 2013)?.name, 'Brooklyn Nets');
  assert.equal(eraIn('29', 2001)?.name, 'Vancouver Grizzlies');
  assert.equal(eraIn('29', 2002)?.name, 'Memphis Grizzlies');
  assert.equal(eraIn('27', 1997)?.name, 'Washington Bullets');
  assert.equal(eraIn('27', 1998)?.name, 'Washington Wizards');
  assert.equal(eraIn('30', 2010)?.name, 'Charlotte Bobcats');
  assert.equal(eraIn('30', 2015)?.name, 'Charlotte Hornets');
  assert.deepEqual(teamEras('3').map((e) => e.name), ['Charlotte Hornets', 'New Orleans Hornets', 'New Orleans/Oklahoma City Hornets', 'New Orleans Hornets', 'New Orleans Pelicans']);
  assert.equal(eraIn('3', 2007)?.abbr, 'NO');
  // Before 1985 ESPN has no tri-codes: the NBA's own are filled in.
  assert.equal(eraIn('12', 1982)?.abbr, 'SDC');
  assert.equal(eraIn('23', 1982)?.abbr, 'KCK');
});

test('a team that never changed has one identity, and LA / Los Angeles is not a change', () => {
  assert.equal(teamEras('2').length, 1);
  assert.equal(teamEras('12').length, 2);
  assert.equal(teamEras('12')[1].name, 'Los Angeles Clippers');
  assert.equal(eraIn('12', 2010)?.current, true);
});

test('a season before ESPN\'s records begin takes the earliest identity; an unknown id has none', () => {
  assert.equal(eraIn('29', 1990)?.name, 'Vancouver Grizzlies');
  assert.equal(eraIn('999', 2005), undefined);
  assert.deepEqual(teamEras('999'), []);
});

test('the team as it was: era name and code, today\'s logos and colors; the very same object when nothing changed', () => {
  const then = teamInSeason(okc, 2007);
  assert.equal(then.displayName, 'Seattle SuperSonics');
  assert.equal(then.abbreviation, 'SEA');
  assert.equal(then.location, 'Seattle');
  assert.equal(then.name, 'SuperSonics');
  // ESPN has no old logo designs: the logos and colors are today's.
  assert.equal(then.logo, 'okc.png');
  assert.equal(then.logoDark, 'okc-dark.png');
  assert.equal(then.logoOnPrimary, 'okc-on.png');
  assert.equal(then.color, '007ac1');
  // The same call gives the same object, so a memo on it holds.
  assert.equal(teamInSeason(okc, 2007), then);
  assert.equal(teamInSeason(okc, 2012), okc);
  assert.equal(teamInSeason(okc, undefined), okc);
  assert.equal(teamInSeason(undefined, 2007), undefined);
});

test('the old logos the app carries are registered by era name, and only a renamed team gets one', () => {
  // Before anything is registered an era keeps today's logo.
  assert.equal(eraLogoFor('25', 2007), undefined);
  registerEraLogos({ '25|Seattle SuperSonics': 'sea.png', '3|New Orleans Hornets': 'noh.png' });
  assert.equal(eraLogoFor('25', 2007), 'sea.png');
  // The Thunder's own years, a season without a name change and a name nobody registered a picture for.
  assert.equal(eraLogoFor('25', 2012), undefined);
  assert.equal(eraLogoFor('2', 2007), undefined);
  assert.equal(eraLogoFor('17', 2005), undefined);
  assert.equal(eraLogoFor('3', 2010), 'noh.png');
  assert.equal(eraLogoFor('25', undefined), undefined);
  assert.equal(eraLogoFor('25', Number.NaN), undefined);
});

test('the team as it was gets the logo of its time; the colors stay today\'s', () => {
  const then = teamInSeason(okc, 2007);
  assert.equal(then.displayName, 'Seattle SuperSonics');
  assert.equal(then.logo, 'sea.png');
  assert.equal(then.logoDark, 'sea.png');
  assert.equal(then.logoOnPrimary, 'sea.png');
  assert.equal(then.color, '007ac1');
  assert.equal(teamInSeason(okc, 2012), okc);
  // A feed's team that already has the name of its time gets only the picture.
  const feed = { id: '25', displayName: 'Seattle SuperSonics', logo: 'guid.png', logoDark: 'guid-dark.png' };
  const dressed = withEraLogo(feed, 2007);
  assert.equal(dressed.logo, 'sea.png');
  assert.equal(dressed.displayName, 'Seattle SuperSonics');
  assert.equal(withEraLogo(feed, 2012), feed);
});

test('a name with a card of its own: the era\'s colors, and only for a past season of a name the app knows', () => {
  assert.deepEqual(eraColorsFor('25', 2007), { color: '#00653A', alternateColor: '#FFC200' });
  assert.equal(!!eraColorsFor('25', 2007), true);
  assert.equal(!!eraColorsFor('17', 2005), true);
  assert.equal(!!eraColorsFor('30', 2010), true);
  assert.equal(!!eraColorsFor('3', 1999), true);
  assert.equal(!!eraColorsFor('3', 2010), true);
  // The names today, a team that never changed, a name with no card (the Bullets), and no season.
  assert.equal(!!eraColorsFor('25', 2012), false);
  assert.equal(!!eraColorsFor('3', 2020), false);
  assert.equal(!!eraColorsFor('2', 2007), false);
  assert.equal(!!eraColorsFor('27', 1995), false);
  assert.equal(!!eraColorsFor('25', undefined), false);
});

test('the team as its card shows it: name, logo and colors of the season; the same object for today and for a name without a card', () => {
  const then = teamAsItWas(okc, 2007);
  assert.equal(then.displayName, 'Seattle SuperSonics');
  assert.equal(then.logo, 'sea.png');
  assert.equal(then.color, '#00653A');
  assert.equal(then.alternateColor, '#FFC200');
  assert.equal(teamAsItWas(okc, 2007), then);
  assert.equal(teamAsItWas(okc, 2012), okc);
  const bullets = { ...okc, id: '27' } as Team;
  // No era colors: today's colors stay (the same as teamInSeason gives).
  assert.equal(teamAsItWas(bullets, 1995).color, '007ac1');
});
