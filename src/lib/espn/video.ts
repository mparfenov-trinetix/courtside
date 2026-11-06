import type { Json } from './client';

/**
 * One clip from a game's summary feed (`videos`): the game's highlights video and single plays ("Cade Cunningham stops and pops a
 * jumper"). Played from the HLS stream (adaptive 360p to 720p, cut in short segments with a keyframe index, so a skip or a drag of
 * the scrubber is quick and the picture adapts to the connection); the one MP4 (about 22 MB for a 16 s clip) is the fallback.
 */
export type GameVideo = {
  id: string;
  headline: string;
  /** Seconds. */
  duration: number;
  thumbnail: string;
  /** What to play: the HLS playlist, or the MP4 when there is none. */
  url: string;
  /** The clip's page on espn.com (plays in a browser, no sign-in for highlights); empty when ESPN gives none. */
  webUrl: string;
  /** The whole game's highlights, not a single play. */
  fullGame: boolean;
  /** ISO publish time (clips of one game, newest last). */
  published: string;
  /** Countries ESPN licenses the clip for; empty when it does not say. */
  countries: string[];
};

/**
 * ESPN lists the countries each clip is licensed for. When this is true the app shows a clip only where the device's region is on
 * that list; false ignores the list. It is false because this is a personal practice app and its owner chose to: the files are public
 * and need no sign-in, but the list is ESPN's licensing signal, so flip this if the app is ever shared.
 */
export const HONOR_VIDEO_REGIONS = false;

const fullGameOf = (headline: string) => /game highlights/i.test(headline);

export function normalizeVideos(json: Json): GameVideo[] {
  const raw: Json[] = json.videos ?? [];
  return raw.flatMap((v): GameVideo[] => {
    const src: Json = v.links?.source ?? {};
    const url: string = src.HLS?.href ?? src.HD?.href ?? src.href ?? v.links?.full?.href ?? '';
    const headline = String(v.headline ?? '');
    if (!url || !headline) return [];
    const geo: Json = v.geoRestrictions ?? {};
    return [
      {
        id: String(v.id ?? url),
        headline,
        duration: Number(v.duration) || 0,
        thumbnail: String(v.thumbnail ?? ''),
        url,
        webUrl: String(v.links?.web?.href ?? v.links?.web?.self?.href ?? ''),
        fullGame: fullGameOf(headline),
        published: String(v.originalPublishDate ?? v.lastModified ?? ''),
        countries: geo.type === 'whitelist' && Array.isArray(geo.countries) ? (geo.countries as string[]) : [],
      },
    ];
  });
}

/** Whether a clip may be shown in `region` (a country code such as "ES"), under `HONOR_VIDEO_REGIONS`. */
export function videoAllowed(video: Pick<GameVideo, 'countries'>, region: string | null | undefined): boolean {
  if (!HONOR_VIDEO_REGIONS || video.countries.length === 0) return true;
  return !!region && video.countries.includes(region.toUpperCase());
}

/** Clips whose headline names someone ("Cade Cunningham ..."), by full name, case and accents ignored. */
export function videosAbout(videos: GameVideo[], name: string): GameVideo[] {
  const key = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const who = key(name);
  return videos.filter((v) => !v.fullGame && key(v.headline).includes(who));
}

/** "1:12" for 72 seconds. */
export function clipLength(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
}

/**
 * The level of an HLS master playlist to start on: 720p at 30 frames a second with the lowest bitrate (the picture is sharp, the
 * 60 fps levels cost half as much again), else the tallest picture offered. The player starts a master playlist at its first (lowest,
 * 360p) level and takes four or five seconds to climb, so a clip looks blurry at first; played at one level it is sharp from the first
 * frame. Returns that level's absolute URL, or null when the text lists no levels.
 */
export function sharpestVariant(master: string, masterUrl: string): string | null {
  const lines = master.split(/\r?\n/);
  const levels: { height: number; fps: number; bandwidth: number; uri: string }[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].startsWith('#EXT-X-STREAM-INF:')) continue;
    const uri = lines[i + 1].trim();
    if (!uri || uri.startsWith('#')) continue;
    const info = lines[i];
    levels.push({
      height: Number(/RESOLUTION=\d+x(\d+)/.exec(info)?.[1]) || 0,
      fps: Number(/FRAME-RATE=([\d.]+)/.exec(info)?.[1]) || 30,
      bandwidth: Number(/[:,]BANDWIDTH=(\d+)/.exec(info)?.[1]) || 0,
      uri,
    });
  }
  if (levels.length === 0) return null;
  const tall = Math.min(720, Math.max(...levels.map((l) => l.height)));
  const pool = levels.filter((l) => l.height >= tall);
  const calm = pool.filter((l) => l.fps <= 30.5);
  const pick = (calm.length > 0 ? calm : pool).reduce((a, b) => (b.bandwidth < a.bandwidth ? b : a));
  return absoluteUrl(pick.uri, masterUrl);
}

/** `uri` as written in a playlist (absolute, root-relative or relative to the playlist) made absolute. */
export function absoluteUrl(uri: string, base: string): string {
  if (/^https?:\/\//i.test(uri)) return uri;
  if (uri.startsWith('/')) return `${/^(https?:\/\/[^/]+)/i.exec(base)?.[1] ?? ''}${uri}`;
  return `${base.slice(0, base.lastIndexOf('/') + 1)}${uri}`;
}

const sharp = new Map<string, string>();

/**
 * What to hand the player for a clip: the sharpest level of its HLS stream (`sharpestVariant`), read from the master playlist (a few
 * hundred bytes). The stream itself when it is not a master playlist, when the read fails or takes more than 4 s: a blurry start beats
 * no start.
 */
export async function sharpSource(url: string): Promise<string> {
  if (!/\.m3u8(\?|$)/i.test(url)) return url;
  const known = sharp.get(url);
  if (known) return known;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 4000);
  try {
    const res = await fetch(url, { signal: abort.signal });
    if (!res.ok) return url;
    const level = sharpestVariant(await res.text(), url);
    if (!level) return url;
    sharp.set(url, level);
    return level;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}
