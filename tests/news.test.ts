import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { articleBlocks, normalizeArticle, normalizeGameRecap, normalizeNews } from '../src/lib/espn';
import { timeAgo } from '../src/lib/date';

// Real responses, trimmed: the league feed with one article of each type, and the text of three of them.
const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/news.json', import.meta.url), 'utf8'));
const feed = normalizeNews(FIXTURE.feed);
const article = (id: string) => normalizeArticle(FIXTURE.articles[id])!;

test('news: every type is told apart and the feed keeps its order', () => {
  assert.deepEqual(feed.map((a) => a.kind), ['recap', 'video', 'news', 'story', 'preview']);
  assert.ok(feed.every((a) => a.headline.length > 0 && a.id.length > 0 && a.published.length > 0));
});

test('news: a recap is about a game and its two teams, its summary has the dash cut off, its picture is the matchup', () => {
  const recap = feed[0];
  assert.deepEqual(recap.teamIds, ['23', '14']);
  assert.equal(recap.gameId, '401909951');
  assert.ok(!recap.description?.startsWith('—'));
  assert.match(recap.image ?? '', /stitcher.*16x9/);
  assert.match(recap.webUrl ?? '', /^https:\/\//);
});

test('news: a story with a header photo uses it, a video its thumbnail, and a team article names its team', () => {
  assert.match(feed[2].image ?? '', /a\.espncdn\.com\/photo\//);
  assert.match(feed[1].image ?? '', /espnmedia/);
  assert.deepEqual(feed[2].teamIds, ['9']);
  assert.equal(feed[2].gameId, undefined);
});

test('news: an item without a headline is dropped, an empty response is an empty list', () => {
  assert.deepEqual(normalizeNews({ articles: [{ id: 1, type: 'Story' }] }), []);
  assert.deepEqual(normalizeNews({}), []);
});

test('article text: paragraphs without tags, links keep their words, byline from the writer or the agency', () => {
  const warriors = article('50429468');
  assert.equal(warriors.byline, 'Associated Press');
  assert.equal(warriors.blocks.length, 4);
  assert.ok(warriors.blocks.every((b) => b.kind === 'paragraph' && !/[<>]/.test(b.text)));
  assert.match(warriors.blocks[0].text, /^SAN FRANCISCO -- Second-year Golden State Warriors guard Will Richard has a torn ligament/);
  assert.equal(article('50423627').byline, 'Zach Kram');
  assert.equal(article('50429571').byline, 'AP');
  assert.match(article('50429571').blocks[0].text, /^INGLEWOOD, Calif\./);
});

test('article text: an empty placeholder paragraph and an aside are dropped', () => {
  const trade = article('50423627');
  assert.ok(trade.blocks.length > 0);
  assert.ok(trade.blocks.every((b) => b.text.length > 0 && !b.text.includes('should not show') && !b.text.includes('video1')));
});

test('article blocks: headings, entities, line breaks and a text with no paragraph tags', () => {
  assert.deepEqual(articleBlocks('<h2>Nov. 8: <a href="x">Kings</a></h2><p>It&#8217;s 5&nbsp;&amp; 3.<br>Next.</p><p>  </p>'), [
    { kind: 'heading', text: 'Nov. 8: Kings' },
    { kind: 'paragraph', text: 'It’s 5 & 3. Next.' },
  ]);
  assert.deepEqual(articleBlocks('First part.\n\nSecond part.'), [
    { kind: 'paragraph', text: 'First part.' },
    { kind: 'paragraph', text: 'Second part.' },
  ]);
  assert.deepEqual(articleBlocks(''), []);
  assert.equal(normalizeArticle({ headlines: [] }), undefined);
});

test('timeAgo: how long ago, the way the news list says it', () => {
  const now = Date.parse('2026-11-09T12:00:00Z');
  assert.equal(timeAgo('2026-11-09T11:59:40Z', now), 'Just now');
  assert.equal(timeAgo('2026-11-09T11:48:00Z', now), '12 min ago');
  assert.equal(timeAgo('2026-11-09T09:00Z', now), '3 h ago');
  assert.equal(timeAgo('2026-11-08T05:00:00Z', now), 'Yesterday');
  assert.match(timeAgo('2026-11-02T05:00:00Z', now), /^Nov [12]$/);
  assert.equal(timeAgo('nonsense', now), '');
});

test('a game summary\'s recap: only a Recap with an id and a headline, the dash cut off its first sentence, a picture when there is one', () => {
  const article = {
    id: 50364199,
    type: 'Recap',
    headline: 'Maxey, James lead 76ers to 7-1 start',
    description: '— Tyrese Maxey scored 15 of his game-high 26 points.',
    images: [{ type: 'Media', ratio: '16x9', url: 'http://espnmedia-cdn.akamaized.net/x.jpg' }],
  };
  assert.deepEqual(normalizeGameRecap(article), {
    id: '50364199',
    headline: 'Maxey, James lead 76ers to 7-1 start',
    description: 'Tyrese Maxey scored 15 of his game-high 26 points.',
    image: 'https://espnmedia-cdn.akamaized.net/x.jpg',
  });
  // A preview (an unplayed game), an article with no id or headline, and no article at all.
  assert.equal(normalizeGameRecap({ ...article, type: 'Preview' }), undefined);
  assert.equal(normalizeGameRecap({ ...article, id: undefined }), undefined);
  assert.equal(normalizeGameRecap({ ...article, headline: '' }), undefined);
  assert.equal(normalizeGameRecap(undefined), undefined);
});
