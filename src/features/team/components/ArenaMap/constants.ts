/** The box the map is drawn in: the lower 48 plus southern Ontario (Toronto is one of the 30). */
export const LON_MIN = -125;
export const LON_MAX = -66;
export const LAT_MIN = 24.5;
export const LAT_MAX = 50;

/** A degree of longitude is shorter than one of latitude; at 38 N it is this much (a flat equirectangular map would look stretched sideways). */
const KX = Math.cos((38 * Math.PI) / 180);

/** Width over height of the map. */
export const ASPECT = ((LON_MAX - LON_MIN) * KX) / (LAT_MAX - LAT_MIN);

/** Distance between the dots of the land grid at rest, in points. Past 2x zoom the map swaps to a grid twice as fine, so the dots keep their look instead of growing. */
export const GRID = 7;
export const MAX_ZOOM = 3.5;
/** The zoom at which the finer grid takes over (and, a little lower, gives way again, so a pinch hovering on the line does not flicker). */
export const FINE_FROM = 2;
export const FINE_BELOW = 1.8;

export function project(lon: number, lat: number, width: number): { x: number; y: number } {
  const height = width / ASPECT;
  return { x: ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * width, y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * height };
}

/**
 * A rough outline of the lower 48 (longitude, latitude), clockwise from the north-west, with southern Ontario folded in so Toronto lands on it.
 * It only decides which dots of the grid are land: the Great Lakes are inside it and are cut out again by `LAKES`; the coasts have a point every degree or so.
 */
export const OUTLINE: [number, number][] = [
  [-124.7, 48.4], [-122.8, 49.0], [-95.2, 49.0], [-94.6, 48.7], [-93.0, 48.6], [-91.4, 48.1], [-89.6, 48.0], [-84.5, 46.5],
  [-81.5, 46.0], [-80.0, 44.7], [-79.3, 44.4], [-76.3, 44.2], [-75.0, 45.0], [-71.5, 45.0], [-70.7, 45.4], [-70.0, 46.7],
  [-69.2, 47.45], [-68.3, 47.35], [-67.8, 47.07], [-67.8, 45.7], [-67.0, 44.8], [-68.8, 44.2], [-70.2, 43.6], [-70.8, 42.8],
  [-70.6, 41.9], [-70.0, 41.7], [-71.4, 41.4], [-72.9, 41.2], [-74.0, 40.6], [-74.1, 39.7], [-75.1, 38.4], [-75.6, 37.2],
  [-76.0, 36.9], [-75.5, 35.3], [-77.0, 34.5], [-78.5, 33.8], [-79.9, 32.7], [-81.0, 31.9], [-81.4, 30.7], [-81.2, 29.6],
  [-80.5, 28.5], [-80.0, 26.8], [-80.1, 25.7], [-80.9, 25.2], [-81.8, 26.2], [-82.7, 27.7], [-82.8, 29.0], [-84.0, 30.1],
  [-85.4, 29.7], [-87.5, 30.3], [-89.2, 30.3], [-89.4, 29.0], [-91.0, 29.2], [-92.0, 29.6], [-93.8, 29.7], [-95.0, 29.1],
  [-97.2, 27.7], [-97.4, 26.0], [-99.1, 26.4], [-99.5, 27.5], [-100.9, 29.3], [-102.4, 29.8], [-103.1, 29.0], [-104.5, 29.6],
  [-106.5, 31.8], [-108.2, 31.8], [-108.2, 31.3], [-111.0, 31.3], [-114.8, 32.5], [-117.1, 32.5], [-117.3, 33.0], [-118.4, 33.8],
  [-119.2, 34.1], [-120.6, 34.5], [-121.9, 36.6], [-122.5, 37.8], [-123.8, 39.5], [-124.4, 40.4], [-124.1, 42.0], [-124.5, 42.8],
  [-124.0, 46.2],
];

/** The Great Lakes, cut out of the land (longitude, latitude). Rough, but enough that Michigan is a mitten and Lake Erie a lake once the grid is fine. */
export const LAKES: [number, number][][] = [
  // Superior
  [[-92.1, 46.75], [-90.5, 46.6], [-89.0, 46.9], [-88.2, 47.4], [-87.0, 46.55], [-85.0, 46.75], [-84.6, 46.5], [-84.8, 47.1], [-86.5, 48.05], [-88.4, 48.3], [-89.6, 48.0], [-91.0, 47.1]],
  // Michigan
  [[-87.8, 42.0], [-87.0, 41.7], [-86.5, 42.2], [-86.3, 43.5], [-86.5, 44.7], [-85.5, 45.2], [-85.0, 45.7], [-84.8, 45.85], [-85.9, 46.0], [-86.8, 45.7], [-87.6, 45.1], [-87.9, 44.3], [-87.5, 43.0]],
  // Huron and Georgian Bay
  [[-84.8, 45.8], [-83.4, 45.2], [-83.3, 44.3], [-82.5, 43.8], [-82.4, 43.0], [-81.7, 43.2], [-81.7, 44.7], [-80.8, 44.9], [-80.1, 44.8], [-80.0, 45.6], [-81.3, 46.0], [-83.0, 46.2], [-84.2, 46.2]],
  // Erie
  [[-83.4, 41.7], [-82.7, 41.45], [-81.7, 41.5], [-80.5, 41.95], [-79.0, 42.6], [-78.9, 42.85], [-79.5, 42.85], [-80.5, 42.6], [-81.6, 42.65], [-82.5, 42.05], [-83.1, 42.0]],
  // Ontario
  [[-79.8, 43.3], [-79.0, 43.25], [-77.5, 43.3], [-76.3, 43.5], [-76.2, 44.05], [-77.0, 43.95], [-78.5, 43.9], [-79.35, 43.6]],
];

export function inside(lon: number, lat: number, poly: [number, number][] = OUTLINE): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const onLand = (lon: number, lat: number) => inside(lon, lat) && !LAKES.some((lake) => inside(lon, lat, lake));

/** One SVG path of zero-length segments, a round-capped dot at each point of a grid of `grid` points that falls on land. */
export function landPath(width: number, grid: number = GRID): string {
  const height = width / ASPECT;
  const parts: string[] = [];
  for (let y = grid / 2; y < height; y += grid) {
    for (let x = grid / 2; x < width; x += grid) {
      const lon = LON_MIN + (x / width) * (LON_MAX - LON_MIN);
      const lat = LAT_MAX - (y / height) * (LAT_MAX - LAT_MIN);
      if (onLand(lon, lat)) parts.push(`M${x.toFixed(1)} ${y.toFixed(1)}h0`);
    }
  }
  return parts.join('');
}
