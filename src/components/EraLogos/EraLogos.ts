import { Image } from 'react-native';

import { registerEraLogos } from '@/lib/espn';

/**
 * The logos of the names a team no longer has, bundled with the app because ESPN keeps none (the logo it files under "Seattle SuperSonics" is
 * the Thunder's). Keyed by team id and the name of the era, as `lib/espn/franchise-eras.ts` has them. One picture per name, the one the team
 * wore longest or last; a name with no picture here (the Bullets, the Vancouver Grizzlies) keeps today's logo. The pictures
 * are sportslogos.net's artwork, the Sonics' Wikipedia's (400 px, `assets/images/history-team-logos`): a practice app, not for distribution.
 */
const LOGOS: Record<string, number> = {
  '25|Seattle SuperSonics': require('@/assets/images/history-team-logos/sea-supersonics.png'),
  '17|New Jersey Nets': require('@/assets/images/history-team-logos/nj-nets.png'),
  '30|Charlotte Bobcats': require('@/assets/images/history-team-logos/charlotte-bobcats.png'),
  '3|Charlotte Hornets': require('@/assets/images/history-team-logos/charlotte-hornets-1988.png'),
  '3|New Orleans Hornets': require('@/assets/images/history-team-logos/new-orleans-hornets.png'),
  '3|New Orleans/Oklahoma City Hornets': require('@/assets/images/history-team-logos/new-orleans-hornets.png'),
  // Looks of a team that kept its name (`lib/espn/franchise-looks.ts`), keyed by team id and the look's key.
  '9|warrior-1997': require('@/assets/images/history-team-logos/gsw-warrior-1997.png'),
  '1|hawks-2008': require('@/assets/images/history-team-logos/hawks-2008.png'),
  '12|clippers-1985': require('@/assets/images/history-team-logos/clippers-1985.png'),
  '23|kings-1995': require('@/assets/images/history-team-logos/kings-1995.png'),
  '26|jazz-2011': require('@/assets/images/history-team-logos/jazz-2011.png'),
  '26|jazz-2005': require('@/assets/images/history-team-logos/jazz-2005.png'),
  '27|wizards-1998': require('@/assets/images/history-team-logos/wizards-1998.png'),
  '27|wizards-2012': require('@/assets/images/history-team-logos/wizards-2012.png'),
  '28|raptors-1996': require('@/assets/images/history-team-logos/raptors-1996.png'),
  '28|raptors-2009': require('@/assets/images/history-team-logos/raptors-2009.png'),
  '5|cavs-2004': require('@/assets/images/history-team-logos/cavs-2004.png'),
  '5|cavs-2011': require('@/assets/images/history-team-logos/cavs-2011.png'),
  '7|nuggets-1994': require('@/assets/images/history-team-logos/nuggets-1994.png'),
  '7|nuggets-2004': require('@/assets/images/history-team-logos/nuggets-2004.png'),
  '7|nuggets-2009': require('@/assets/images/history-team-logos/nuggets-2009.png'),
  '8|pistons-1997': require('@/assets/images/history-team-logos/pistons-1997.png'),
  '15|bucks-1994': require('@/assets/images/history-team-logos/bucks-1994.png'),
  '16|wolves-1997': require('@/assets/images/history-team-logos/wolves-1997.png'),
  '19|magic-2001': require('@/assets/images/history-team-logos/magic-2001.png'),
  '15|bucks-2007': require('@/assets/images/history-team-logos/bucks-2007.png'),
  '8|pistons-2006': require('@/assets/images/history-team-logos/pistons-2006.png'),
  '19|magic-2011': require('@/assets/images/history-team-logos/magic-2011.png'),
  '16|wolves-2009': require('@/assets/images/history-team-logos/wolves-2009.png'),
  '16|wolves-2018': require('@/assets/images/history-team-logos/wolves-2018.png'),
  '24|spurs-2003': require('@/assets/images/history-team-logos/spurs-2003.png'),
  '20|sixers-1998': require('@/assets/images/history-team-logos/sixers-1998.png'),
  '12|clippers-2016': require('@/assets/images/history-team-logos/clippers-2016.png'),
};

/**
 * Hands the pictures to the team lookups; once, at start-up, before anything draws a past season. Returns a short fingerprint of where the
 * pictures are (the bundle's path, which changes with every install, and a hash of each file in development): the feeds the app keeps on
 * disk carry those addresses, so the root layout puts the fingerprint in the cache's buster and a cache written for another install, or
 * before a picture was replaced, is dropped instead of pointing at a file that is gone.
 */
export function installEraLogos(): string {
  const uris: Record<string, string> = {};
  for (const [key, source] of Object.entries(LOGOS)) {
    const uri = Image.resolveAssetSource(source)?.uri;
    if (uri) uris[key] = uri;
  }
  registerEraLogos(uris);
  const text = Object.values(uris).join('|');
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}
