import { parseEspnDate, toNbaDateKey } from '../date';

/**
 * A finished game's video on YouTube: the "Game Recap" the Motion Station channel (@motionstation4342) puts up for every NBA game, the
 * same video Sofascore shows as the game's "Full Highlights". (The NBA's own full-game highlights are geo-restricted to 24 countries
 * and Spain is not one; Motion Station's play there.) Its titles read "Game Recap: Heat 114, Kings 108 (Nov. 8)": winner first, the
 * final score, the Eastern day the game was played. YouTube has no feed for the channel (its RSS answers 404), so the video is found by
 * searching that title through the same internal endpoint youtube.com's own search box uses: undocumented, no key, any date.
 */
export const MOTION_STATION_ID = 'UCLd4dSmXdrJykO_hgOzbfPw';

export type SearchVideo = { id: string; title: string; channelId?: string };

export type RecapGame = { awayName: string; homeName: string; awayScore: number; homeScore: number; date?: string };

const SEARCH_URL = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false';
const CLIENT = { clientName: 'WEB', clientVersion: '2.20260101.00.00', hl: 'en', gl: 'US' };

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const norm = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** The title the game's recap is expected to have, as a search text (the winner first, as the channel writes it). */
export function recapQuery(game: RecapGame): string {
  const awayWon = game.awayScore > game.homeScore;
  const [win, wins, lose, loses] = awayWon ? [game.awayName, game.awayScore, game.homeName, game.homeScore] : [game.homeName, game.homeScore, game.awayName, game.awayScore];
  return `Motion Station Game Recap: ${win} ${wins}, ${lose} ${loses}`;
}

/** Pure: the videos of a search response (`videoRenderer` entries, anywhere in it), with the channel each came from. */
export function parseSearchResults(json: unknown): SearchVideo[] {
  const found: SearchVideo[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, any>;
    const v = record.videoRenderer;
    if (v && typeof v.videoId === 'string') {
      const title = ((v.title?.runs ?? []) as { text?: string }[]).map((r) => r.text ?? '').join('');
      const channelId = v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;
      if (title) found.push({ id: v.videoId, title, channelId: typeof channelId === 'string' ? channelId : undefined });
    }
    Object.values(record).forEach(walk);
  };
  walk(json);
  return found;
}

export async function searchVideos(query: string): Promise<SearchVideo[]> {
  const res = await fetch(SEARCH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context: { client: CLIENT }, query }) });
  if (!res.ok) throw new Error(`YouTube returned ${res.status} for a search`);
  return parseSearchResults(await res.json());
}

// The loser's score is optional: the channel sometimes leaves it out of the title ("Game Recap: Lakers 124, Hawks (Nov. 9)").
const TITLE = /^Game Recap:\s*(.+?)\s+(\d+),\s*(.+?)(?:\s+(\d+))?\s*\(([A-Za-z]+)\.?\s+(\d{1,2})\)\s*$/i;

/**
 * The title "Game Recap: Heat 114, Kings 108 (Nov. 8)" taken apart: nicknames as written, scores, and the month (0-11) and day.
 * `loserScore` is undefined when the title does not carry it.
 */
export function parseRecapTitle(title: string): { winner: string; winnerScore: number; loser: string; loserScore?: number; month: number; day: number } | undefined {
  const m = TITLE.exec(title.trim());
  if (!m) return undefined;
  const month = MONTHS.indexOf(m[5].slice(0, 3).toLowerCase());
  if (month < 0) return undefined;
  return { winner: norm(m[1]), winnerScore: Number(m[2]), loser: norm(m[3]), loserScore: m[4] === undefined ? undefined : Number(m[4]), month, day: Number(m[6]) };
}

/**
 * Pure: the channel's recap of one game among search results, or undefined. It has to come from Motion Station, name both teams with the
 * game's final score (the loser's may be missing from the title), and (when the game's date is known) be dated the Eastern day the game was played: a rematch has another score or day.
 */
export function findGameRecap(videos: SearchVideo[], game: RecapGame): SearchVideo | undefined {
  const awayWon = game.awayScore > game.homeScore;
  const winner = norm(awayWon ? game.awayName : game.homeName);
  const loser = norm(awayWon ? game.homeName : game.awayName);
  const winnerScore = awayWon ? game.awayScore : game.homeScore;
  const loserScore = awayWon ? game.homeScore : game.awayScore;
  const start = game.date ? parseEspnDate(game.date) : undefined;
  const key = start && !Number.isNaN(start.getTime()) ? toNbaDateKey(start) : undefined;
  return videos.find((v) => {
    if (v.channelId !== MOTION_STATION_ID) return false;
    const t = parseRecapTitle(v.title);
    if (!t || t.winner !== winner || t.loser !== loser || t.winnerScore !== winnerScore) return false;
    // A title without the loser's score still names the winner's, both teams and the day, which is enough to tell a rematch apart.
    if (t.loserScore !== undefined && t.loserScore !== loserScore) return false;
    return !key || (t.month === Number(key.slice(4, 6)) - 1 && t.day === Number(key.slice(6, 8)));
  });
}

/** The video's thumbnail: the largest the channel's uploads have (a 16:9 picture, no black bars), or the 320 px one. */
export const youtubeThumbnail = (id: string, size: 'maxres' | 'mq' = 'maxres') => `https://i.ytimg.com/vi/${id}/${size === 'maxres' ? 'maxresdefault' : 'mqdefault'}.jpg`;

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
