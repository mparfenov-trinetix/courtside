/**
 * The 30 arenas, by ESPN team id. Hand-kept: ESPN's own venue record is stale for several clubs (it still names the Nets' Prudential Center, the
 * Warriors' Oracle Arena, the Bucks' Bradley Center, the Kings' Sleep Train Arena, and says the Clippers play at crypto.com Arena), and it
 * carries no coordinates. Names change with naming rights, so recheck them each season with the champions list; the positions are the
 * buildings' own, good to about a block, which is plenty for a dot on a map.
 */
export type Arena = { name: string; city: string; lat: number; lon: number };

export const ARENAS: Record<string, Arena> = {
  '1': { name: 'State Farm Arena', city: 'Atlanta', lat: 33.7573, lon: -84.3963 },
  '2': { name: 'TD Garden', city: 'Boston', lat: 42.3662, lon: -71.0621 },
  '17': { name: 'Barclays Center', city: 'Brooklyn', lat: 40.6826, lon: -73.9754 },
  '30': { name: 'Spectrum Center', city: 'Charlotte', lat: 35.2251, lon: -80.8392 },
  '4': { name: 'United Center', city: 'Chicago', lat: 41.8807, lon: -87.6742 },
  '5': { name: 'Rocket Arena', city: 'Cleveland', lat: 41.4965, lon: -81.6882 },
  '6': { name: 'American Airlines Center', city: 'Dallas', lat: 32.7905, lon: -96.8103 },
  '7': { name: 'Ball Arena', city: 'Denver', lat: 39.7487, lon: -105.0077 },
  '8': { name: 'Little Caesars Arena', city: 'Detroit', lat: 42.3411, lon: -83.0553 },
  '9': { name: 'Chase Center', city: 'San Francisco', lat: 37.768, lon: -122.3877 },
  '10': { name: 'Toyota Center', city: 'Houston', lat: 29.7508, lon: -95.3621 },
  '11': { name: 'Gainbridge Fieldhouse', city: 'Indianapolis', lat: 39.764, lon: -86.1555 },
  '12': { name: 'Intuit Dome', city: 'Inglewood', lat: 33.9958, lon: -118.3419 },
  '13': { name: 'Crypto.com Arena', city: 'Los Angeles', lat: 34.043, lon: -118.2673 },
  '29': { name: 'FedExForum', city: 'Memphis', lat: 35.1382, lon: -90.0505 },
  '14': { name: 'Kaseya Center', city: 'Miami', lat: 25.7814, lon: -80.187 },
  '15': { name: 'Fiserv Forum', city: 'Milwaukee', lat: 43.0451, lon: -87.9174 },
  '16': { name: 'Target Center', city: 'Minneapolis', lat: 44.9795, lon: -93.2761 },
  '3': { name: 'Smoothie King Center', city: 'New Orleans', lat: 29.949, lon: -90.0821 },
  '18': { name: 'Madison Square Garden', city: 'New York', lat: 40.7505, lon: -73.9934 },
  '25': { name: 'Paycom Center', city: 'Oklahoma City', lat: 35.4634, lon: -97.5151 },
  '19': { name: 'Kia Center', city: 'Orlando', lat: 28.5392, lon: -81.3839 },
  '20': { name: 'Xfinity Mobile Arena', city: 'Philadelphia', lat: 39.9012, lon: -75.172 },
  '21': { name: 'Mortgage Matchup Center', city: 'Phoenix', lat: 33.4457, lon: -112.0712 },
  '22': { name: 'Moda Center', city: 'Portland', lat: 45.5316, lon: -122.6668 },
  '23': { name: 'Golden 1 Center', city: 'Sacramento', lat: 38.5802, lon: -121.4997 },
  '24': { name: 'Frost Bank Center', city: 'San Antonio', lat: 29.427, lon: -98.4375 },
  '28': { name: 'Scotiabank Arena', city: 'Toronto', lat: 43.6435, lon: -79.3791 },
  '26': { name: 'Delta Center', city: 'Salt Lake City', lat: 40.7683, lon: -111.9011 },
  '27': { name: 'Capital One Arena', city: 'Washington', lat: 38.8981, lon: -77.0209 },
};

/** The arena of a franchise (undefined for an id that is not one of the 30, e.g. an All-Star side). */
export function arenaOf(teamId?: string | null): Arena | undefined {
  return teamId ? ARENAS[teamId] : undefined;
}

/** Great-circle distance between two arenas in miles (what a road trip is measured in). */
export function milesBetween(a: Arena, b: Arena): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 3958.8 * Math.asin(Math.sqrt(h)));
}
