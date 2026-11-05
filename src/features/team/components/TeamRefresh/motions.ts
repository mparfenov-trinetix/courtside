import type { TeamMotion, Wave } from './types';

const sine = (a: number, c = 1, p = 0): Wave => ({ a, k: 'sine', c, p });
const hop = (a: number, c = 1, p = 0): Wave => ({ a, k: 'abs', c, p });
const tri = (a: number, c = 1, p = 0.25): Wave => ({ a, k: 'tri', c, p });
const spike = (a: number, c = 1, p = 0): Wave => ({ a, k: 'pulse', c, p });
const spring = (a: number, c = 1, p = 0): Wave => ({ a, k: 'spring', c, p });
const plat = (a: number, c = 1, p = 0): Wave => ({ a, k: 'plat', c, p });

const LOOP = 1700;

/**
 * Every team's own refresh animation: what its logo does on the team card, themed on its name (the Hawks soar, the
 * Rockets launch, the Jazz bop...). Keyed by ESPN's abbreviation. A loop is `period` ms and every wave is at rest at
 * the start and end of it, so the logo settles back where it began.
 */
export const MOTIONS: Record<string, TeamMotion> = {
  // Hawks: soars and glides.
  ATL: { period: LOOP, logo: { y: sine(5), r: sine(9, 1) } },
  // Celtics: hoists itself up like a banner, growing as it goes.
  BOS: { period: 2200, logo: { y: plat(-14), s: plat(0.1) } },
  // Nets: sways like a net.
  BKN: { period: LOOP, logo: { r: sine(6), y: sine(1.5, 2) } },
  // Hornets: buzzes.
  CHA: { period: 1300, logo: { x: sine(2.5, 7), y: sine(2.5, 6), r: sine(5, 7) } },
  // Bulls: charges side to side.
  CHI: { period: 1500, logo: { x: tri(8, 2), s: sine(0.06, 2) } },
  // Cavaliers: takes a heavy hit and rings down, the Land holding its ground.
  CLE: { period: 1800, logo: { x: spring(14), r: spring(-5), s: spring(0.05) } },
  // Mavericks: gallops.
  DAL: { period: 1400, logo: { y: hop(-6, 2), r: sine(7, 2) } },
  // Nuggets: gleams.
  DEN: { period: 1800, logo: { s: spike(0.14, 2), y: sine(2) } },
  // Pistons: pumps like a piston.
  DET: { period: 1100, logo: { y: hop(-4, 4), s: sine(0.04, 4) } },
  // Warriors: sways like a bridge.
  GS: { period: LOOP, logo: { r: sine(10), y: sine(3) } },
  // Rockets: launches and shakes.
  HOU: { period: 1400, logo: { y: hop(-10), x: sine(1.5, 12) } },
  // Pacers: races.
  IND: { period: 1200, logo: { x: sine(6, 2), s: sine(0.03, 4) } },
  // Clippers: sails over the swell.
  LAC: { period: 2000, logo: { y: sine(4), r: sine(9, 1) } },
  // Lakers: shines.
  LAL: { period: 1800, logo: { s: spike(0.12), y: sine(2) } },
  // Grizzlies: swipes.
  MEM: { period: 1500, logo: { r: tri(14, 2), x: sine(3, 2) } },
  // Heat: flickers.
  MIA: { period: 1500, logo: { s: sine(0.06, 5), y: sine(1.5, 6), r: sine(3, 4) } },
  // Bucks: leaps.
  MIL: { period: LOOP, logo: { y: hop(-12), r: sine(10), x: sine(3) } },
  // Timberwolves: throws its head back to howl.
  MIN: { period: 1900, logo: { r: spike(-16), s: spike(0.12) } },
  // Pelicans: dives.
  NO: { period: LOOP, logo: { y: spike(9), r: sine(12) } },
  // Knicks: bounces to a streetball beat.
  NY: { period: 1300, logo: { y: hop(-7, 2), r: sine(3, 2) } },
  // Thunder: flashes and jolts.
  OKC: { period: 1200, logo: { s: spike(0.22, 2), x: sine(2, 9) } },
  // Magic: floats.
  ORL: { period: 2000, logo: { y: sine(5), r: sine(4, 1) } },
  // 76ers: swings like the Liberty Bell.
  PHI: { period: 1800, logo: { r: sine(16) } },
  // Suns: pulses like the sun, a slow swell of heat.
  PHX: { period: 2000, logo: { s: sine(0.1, 3), r: sine(4, 1.5) } },
  // Trail Blazers: flares.
  POR: { period: 1500, logo: { s: spike(0.14, 2), y: sine(2, 2) } },
  // Kings: holds court with a regal bob.
  SAC: { period: 1900, logo: { y: sine(3), s: sine(0.04) } },
  // Spurs: stretches tall and steady, Wembanyama-style.
  SA: { period: 2000, logo: { st: plat(0.16), y: plat(-4) } },
  // Raptors: crouches and pounces.
  TOR: { period: 1600, logo: { y: spike(-12), s: spike(0.1, 1) } },
  // Jazz: bops to a groove.
  UTAH: { period: 1600, logo: { r: sine(8, 2), y: hop(-4, 2) } },
  // Wizards: flicks like a wand.
  WSH: { period: 1800, logo: { r: sine(12, 2), s: spike(0.06, 2) } },
};

/** A team ESPN adds later still gets a motion: a gentle bounce. */
export const DEFAULT_MOTION: TeamMotion = { period: LOOP, logo: { y: hop(-6, 2) } };

export const motionOf = (abbreviation: string): TeamMotion => MOTIONS[abbreviation] ?? DEFAULT_MOTION;
