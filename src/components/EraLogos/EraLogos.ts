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
