import { BASE, getJson, type Json } from './client';

/**
 * ESPN's NBA news. The site API's `news` feed lists the latest articles (the league's, or one team's with `?team=`): a headline, a one-line
 * summary, a picture, a type (game recap, preview, story, headline, video) and the teams it is about. The text of an article is in the
 * content API (`content.core.api.espn.com/v1/sports/news/{id}`) as a little HTML (paragraphs, a few links and pictures), which is turned
 * into plain paragraphs here. Videos have no text, only a page on espn.com.
 */

export type NewsKind = 'recap' | 'preview' | 'story' | 'news' | 'video';

export type NewsArticle = {
  id: string;
  kind: NewsKind;
  headline: string;
  /** ESPN's one-line summary (for a recap it is the game's first sentence). */
  description?: string;
  /** ISO time, as ESPN writes it. */
  published: string;
  image?: string;
  /** The article's page on espn.com. */
  webUrl?: string;
  /** The teams the article is about (ESPN team ids), a game's two teams for a recap or a preview. */
  teamIds: string[];
  gameId?: string;
};

export type ArticleBlock = { kind: 'paragraph' | 'heading'; text: string };

export type ArticleText = {
  id: string;
  headline: string;
  /** Who wrote it: ESPN's byline, or the agency ("Associated Press"). */
  byline?: string;
  published?: string;
  /** The lead picture, when the feed's article had none to give. */
  image?: string;
  blocks: ArticleBlock[];
  webUrl?: string;
};

const KINDS: Record<string, NewsKind> = { Recap: 'recap', Preview: 'preview', Story: 'story', HeadlineNews: 'news', Media: 'video' };

const https = (url: unknown): string | undefined => (typeof url === 'string' && url ? url.replace('http://', 'https://') : undefined);

/** A story's picture: ESPN's header photo, else a 16:9 one (a recap's is a picture of the matchup), else whichever there is. */
function pickImage(images: Json[]): string | undefined {
  const withUrl = images.filter((i) => typeof i?.url === 'string');
  const pick = withUrl.find((i) => i.type === 'header') ?? withUrl.find((i) => i.ratio === '16x9') ?? withUrl[0];
  return https(pick?.url);
}

/** Pure: the articles of a `news` response, newest first as ESPN sends them; anything without a headline is dropped. */
export function normalizeNews(json: Json): NewsArticle[] {
  return ((json.articles ?? []) as Json[]).flatMap((a): NewsArticle[] => {
    if (!a.headline || a.id == null) return [];
    const categories = (a.categories ?? []) as Json[];
    const gameId = categories.find((c) => c.type === 'event')?.eventId ?? a.gameId ?? a.eventId;
    return [
      {
        id: String(a.id),
        kind: KINDS[String(a.type)] ?? 'news',
        headline: String(a.headline),
        description: a.description ? String(a.description).replace(/^\s*[—-]\s*/, '') : undefined,
        published: String(a.published ?? a.lastModified ?? ''),
        image: pickImage((a.images ?? []) as Json[]),
        webUrl: https(a.links?.web?.href),
        teamIds: [...new Set(categories.filter((c) => c.type === 'team' && c.teamId != null).map((c) => String(c.teamId)))],
        gameId: gameId != null ? String(gameId) : undefined,
      },
    ];
  });
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const plain = (html: string): string =>
  decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

/** Pure: an article's HTML as paragraphs and headings. Pictures, videos, asides and every tag are dropped; links keep their words. */
export function articleBlocks(html: string): ArticleBlock[] {
  const cleaned = html.replace(/<(aside|figure|script|style)\b[\s\S]*?<\/\1>/gi, '');
  const blocks: ArticleBlock[] = [];
  for (const m of cleaned.matchAll(/<(p|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = plain(m[2]);
    if (text) blocks.push({ kind: m[1].toLowerCase() === 'p' ? 'paragraph' : 'heading', text });
  }
  if (blocks.length > 0) return blocks;
  // No paragraph tags at all: blank lines separate the paragraphs.
  return cleaned
    .split(/\n\s*\n/)
    .map((part) => plain(part))
    .filter(Boolean)
    .map((text) => ({ kind: 'paragraph' as const, text }));
}

/** Pure: one article from the content API's response. */
export function normalizeArticle(json: Json): ArticleText | undefined {
  const a = (json.headlines?.[0] ?? undefined) as Json | undefined;
  if (!a?.headline) return undefined;
  const source = typeof a.source === 'string' ? a.source : a.source?.name;
  return {
    id: String(a.id),
    headline: String(a.headline),
    byline: a.byline ? String(a.byline) : source ? String(source) : undefined,
    published: a.published ? String(a.published) : undefined,
    image: pickImage((a.images ?? []) as Json[]),
    blocks: articleBlocks(String(a.story ?? '')),
    webUrl: https(a.links?.web?.href),
  };
}

/** The latest articles: the league's, or (with a team id) one team's. */
export async function fetchNews(teamId?: string): Promise<NewsArticle[]> {
  return normalizeNews(await getJson(`${BASE}/news?limit=50${teamId ? `&team=${teamId}` : ''}`));
}

/** One article's text. Undefined for a video, or one ESPN no longer has. */
export async function fetchArticle(id: string): Promise<ArticleText | undefined> {
  return normalizeArticle(await getJson(`https://content.core.api.espn.com/v1/sports/news/${id}`));
}
