import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { normalizeGameSummary, normalizePlayerSearch } from '../src/lib/espn';
import { formatGameScore, formatRating, gameRating, gameScore, positionName, ratingOf, shotsOf, timeoutInProgress, buildFourFactors, deriveFlow, deriveQuarterStats, sumLineups, sumPeriods } from '../src/lib/game';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/game-final.json', import.meta.url), 'utf8'));
const game = normalizeGameSummary(fixture, '401909912');
const { home, away, plays } = game;

const derived = deriveQuarterStats(
  plays,
  [
    { teamId: away.team.id, starterIds: away.starters.map((p) => p.id) },
    { teamId: home.team.id, starterIds: home.starters.map((p) => p.id) },
  ],
  home.team.id,
);
const allPeriods = derived.periods;

test('the fixture parses into a finished game with two full box scores', () => {
  assert.equal(game.completed, true);
  assert.ok(plays.length > 400);
  assert.ok(home.starters.length === 5 && away.starters.length === 5);
});

test('per-period player lines add back up to the official box score', () => {
  for (const team of [home, away]) {
    for (const p of [...team.starters, ...team.bench]) {
      const line = sumPeriods(derived.players, allPeriods, p.id);
      const box = (k: string) => Number(p.stats[k] ?? 0);
      assert.equal(line.pts, box('PTS'), `${p.name} PTS`);
      assert.equal(line.ast, box('AST'), `${p.name} AST`);
      assert.equal(line.oreb + line.dreb, box('REB'), `${p.name} REB`);
      assert.equal(line.stl, box('STL'), `${p.name} STL`);
      assert.equal(line.blk, box('BLK'), `${p.name} BLK`);
      assert.equal(line.to, box('TO'), `${p.name} TO`);
      assert.equal(`${line.fgm}-${line.fga}`, p.stats['FG'], `${p.name} FG`);
      assert.equal(`${line.tpm}-${line.tpa}`, p.stats['3PT'], `${p.name} 3PT`);
    }
  }
});

test('team points per period sum to the final score', () => {
  for (const team of [home, away]) {
    assert.equal(sumPeriods(derived.teams, allPeriods, team.team.id).pts, team.score);
  }
});

test('lineups: every group has five players and together they cover regulation', () => {
  for (const team of [home, away]) {
    const groups = sumLineups(derived, null, team.team.id);
    assert.ok(groups.length > 3);
    assert.ok(groups.every((g) => g.ids.length === 5));
    const seconds = groups.reduce((acc, g) => acc + g.sec, 0);
    assert.ok(Math.abs(seconds - 4 * 720) < 30, `${team.team.abbreviation} lineup time ${seconds}`);
  }
});

test('lead changes and largest leads agree with ESPN', () => {
  const flow = deriveFlow(plays, home.team.id, away.team.id);
  const espn = (side: 'home' | 'away', name: string) => {
    const team = fixture.boxscore.teams.find((t: any) => t.homeAway === side);
    return Number(team.statistics.find((s: any) => s.name === name).displayValue);
  };
  assert.equal(flow.leadChanges, espn('home', 'leadChanges'));
  assert.equal(flow.largestHome?.margin ?? 0, espn('home', 'largestLead'));
  assert.equal(flow.largestAway?.margin ?? 0, espn('away', 'largestLead'));
});

const play = (id: number, awayScore: number, homeScore: number) => ({
  id: String(id), period: 1, clockText: '10:00', text: '', typeText: '', homeScore, awayScore,
  scoring: true, scoreValue: 0, shooting: false, pointsAttempted: 0, athleteIds: [],
});

test('flow: unanswered scoring is one run, an answer ends it', () => {
  // home 0-0 -> 6-0 (run), away answers 6-2, away 6-5 (a 3-0 run of its own)
  const seq = [play(1, 0, 2), play(2, 0, 4), play(3, 0, 6), play(4, 2, 6), play(5, 5, 6)];
  const flow = deriveFlow(seq as any, 'H', 'A');
  assert.equal(flow.bestHomeRun?.points, 6);
  assert.equal(flow.bestAwayRun?.points, 5);
  assert.equal(flow.largestHome?.margin, 6);
  assert.equal(flow.leadChanges, 0);
});

test('flow: a lead change is counted when the leader flips, a tie is not', () => {
  const seq = [play(1, 0, 2), play(2, 2, 2), play(3, 4, 2), play(4, 4, 5)];
  const flow = deriveFlow(seq as any, 'H', 'A');
  assert.equal(flow.leadChanges, 2); // home -> away, away -> home (the tie in between doesn't count)
  assert.equal(flow.ties, 1);
});

test('four factors: eFG% weights threes, and the rebound row is dropped without an OREB/DREB split', () => {
  const t = { pts: 0, fgm: 40, fga: 80, tpm: 10, tpa: 30, ftm: 15, fta: 20, reb: 0, oreb: 0, dreb: 0, ast: 0, to: 12, stl: 0, blk: 0, pf: 0 };
  const rows = buildFourFactors(t, t);
  assert.equal(rows[0].awayText, '56.3%'); // (40 + 0.5*10) / 80
  assert.ok(!rows.some((r) => r.label === 'Off. rebound rate'));
  assert.equal(buildFourFactors({ ...t, oreb: 8, dreb: 30 }, { ...t, oreb: 10, dreb: 28 }).length, 4);
});

test('shotsOf: one player field goals with locations, free throws left out', () => {
  const shooter = plays.find((p) => p.shooting && p.x != null && p.athleteIds[0])!.athleteIds[0];
  const shots = shotsOf(plays, shooter);
  assert.ok(shots.length > 3);
  assert.ok(shots.every((s) => s.x >= 0 && s.x <= 50 && s.y >= 0 && s.y <= 47));
  assert.ok(shots.some((s) => s.made) && shots.some((s) => !s.made));
  assert.deepEqual(shotsOf(plays, 'nobody'), []);
});

test('a timeout is in progress only while it is the newest play of a live game', () => {
  const at = plays.findIndex((p) => /timeout/i.test(p.typeText) && p.teamId);
  assert.ok(at > 0);
  const timeout = plays[at];
  // The feed stops on the timeout: it is on, and belongs to the team that called it.
  assert.deepEqual(timeoutInProgress(plays.slice(0, at + 1), true), { teamId: timeout.teamId });
  // Play resumed (the next play exists), the game ended, or it never started: no timeout.
  assert.equal(timeoutInProgress(plays.slice(0, at + 2), true), null);
  assert.equal(timeoutInProgress(plays.slice(0, at + 1), false), null);
  assert.equal(timeoutInProgress([], true), null);
});

test('a timeout with no team is an official one', () => {
  const official = { ...plays[0], typeText: 'Official Timeout', teamId: undefined };
  assert.deepEqual(timeoutInProgress([official], true), { teamId: undefined });
});

test('a game is polled from shortly before tip-off, not only once it is live', async () => {
  const { gamePhase } = await import('../src/lib/game');
  const now = Date.parse('2026-11-05T00:00:00Z');
  const at = (minutes: number) => new Date(now + minutes * 60_000).toISOString();
  assert.equal(gamePhase({ live: false, completed: false, date: at(120) }, now), 'idle');
  assert.equal(gamePhase({ live: false, completed: false, date: at(15) }, now), 'soon');
  assert.equal(gamePhase({ live: false, completed: false, date: at(-5) }, now), 'soon'); // should have started
  assert.equal(gamePhase({ live: false, completed: false, date: at(-600) }, now), 'idle'); // long gone: postponed
  assert.equal(gamePhase({ live: true, completed: false, date: at(-30) }, now), 'live');
  assert.equal(gamePhase({ live: false, completed: true, date: at(-200) }, now), 'idle');
  assert.equal(gamePhase({ live: false, completed: false, date: '2026-11-05T00:10Z' }, now), 'soon'); // ESPN's no-seconds dates
});

test('a day of games is polled while any is on or about to start, and a waiting day asks to be re-checked', async () => {
  const { boardPhase, awaitsTipOff } = await import('../src/lib/game');
  const now = Date.parse('2026-11-05T00:00:00Z');
  const at = (minutes: number) => new Date(now + minutes * 60_000).toISOString();
  const g = (inProgress: boolean, completed: boolean, minutes: number) => ({ inProgress, completed, date: at(minutes) });
  assert.equal(boardPhase([g(false, true, -200), g(true, false, -60)], now), 'live');
  assert.equal(boardPhase([g(false, true, -200), g(false, false, 10)], now), 'soon');
  assert.equal(boardPhase([g(false, true, -200), g(false, false, 300)], now), 'idle');
  assert.equal(boardPhase(undefined, now), 'idle');
  // Night games hours away: nothing to poll yet, but the page must look at the clock again to notice tip-off.
  assert.equal(awaitsTipOff([g(false, false, 300)]), true);
  assert.equal(awaitsTipOff([g(false, true, -200)]), false);
});

test('videos: clips are read from the summary, the game highlights are told apart, names are matched', async () => {
  const { normalizeVideos, videosAbout, videoAllowed, clipLength } = await import('../src/lib/espn/video.ts');
  const clip = (id: string, headline: string, over: object = {}) => ({
    id, headline, duration: 72, thumbnail: `${id}.jpg`, originalPublishDate: '2026-11-05T00:00Z',
    links: { source: { href: `https://cdn/${id}.mp4`, HD: { href: `https://cdn/${id}-hd.mp4` }, HLS: { href: `https://cdn/${id}/playlist.m3u8` } } }, ...over,
  });
  const videos = normalizeVideos({
    videos: [
      clip('a', 'Philadelphia 76ers vs. Detroit Pistons: Game Highlights', {
        links: { web: { href: 'https://www.espn.com/video/clip/_/id/a/x' }, source: { href: 'https://cdn/a.mp4', HLS: { href: 'https://cdn/a/playlist.m3u8' } } },
      }),
      clip('b', 'Cade Cunningham stops and pops a jumper for Pistons', { duration: 16, geoRestrictions: { type: 'whitelist', countries: ['US'] } }),
      { id: 'c', headline: 'No link' },
    ],
  });
  assert.equal(videos.length, 2); // the one without a file is dropped
  assert.equal(videos[0].fullGame, true);
  assert.equal(videos[0].webUrl, 'https://www.espn.com/video/clip/_/id/a/x'); // the page to watch it on in a browser
  assert.equal(videos[1].webUrl, ''); // none given
  assert.equal(videos[0].url, 'https://cdn/a/playlist.m3u8'); // the stream is preferred to the MP4
  assert.equal(normalizeVideos({ videos: [clip('m', 'Only a file', { links: { source: { href: 'https://cdn/m.mp4' } } })] })[0].url, 'https://cdn/m.mp4');
  assert.deepEqual(videos[1].countries, ['US']);
  assert.deepEqual(videosAbout(videos, 'Cade Cunningham').map((v) => v.id), ['b']);
  assert.equal(videosAbout(videos, 'Jalen Duren').length, 0);
  assert.equal(videoAllowed(videos[1], 'ES'), true); // the region list is not honored (see HONOR_VIDEO_REGIONS)
  assert.equal(clipLength(72), '1:12');
  assert.equal(clipLength(16), '0:16');
});

test('videos: a stream starts on its 720p level, not the 360p one the player would begin with', async () => {
  const { sharpestVariant, absoluteUrl } = await import('../src/lib/espn/video.ts');
  const level = (bw: number, res: string, fps: number, uri: string) => `#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=${bw},RESOLUTION=${res},FRAME-RATE=${fps},CODECS="avc1.64001e,mp4a.40.2"\n${uri}`;
  const master = [
    '#EXTM3U',
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs0",NAME="English",URI="index-svtt.m3u8"',
    level(696000, '640x360', 29.97, 'index-f1.m3u8'),
    level(2796000, '848x480', 29.97, 'index-f4.m3u8'),
    level(4596000, '1280x720', 29.97, 'index-f6.m3u8'),
    level(3696000, '1280x720', 29.97, 'index-f5.m3u8'),
    level(6471000, '1280x720', 59.92, 'index-f7.m3u8'),
    '#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=76686,RESOLUTION=640x360,URI="iframes-f1.m3u8"',
  ].join('\n');
  assert.equal(sharpestVariant(master, 'https://cdn.example/a/b/playlist.m3u8'), 'https://cdn.example/a/b/index-f5.m3u8');
  // Only 480p offered: the tallest there is. Nothing listed: no pick.
  assert.equal(sharpestVariant([level(696000, '640x360', 30, 'a.m3u8'), level(1896000, '848x480', 30, 'b.m3u8')].join('\n'), 'https://x/y/p.m3u8'), 'https://x/y/b.m3u8');
  assert.equal(sharpestVariant('#EXTM3U\n', 'https://x/p.m3u8'), null);
  assert.equal(absoluteUrl('https://other/z.m3u8', 'https://x/y/p.m3u8'), 'https://other/z.m3u8');
  assert.equal(absoluteUrl('/root/z.m3u8', 'https://x/y/p.m3u8'), 'https://x/root/z.m3u8');
});

test('game kind: regular, preseason, playoffs, play-in, Cup and All-Star games are told apart', async () => {
  const { classifyGame } = await import('../src/lib/espn/common.ts');
  assert.equal(classifyGame(undefined, 2), 'regular');
  assert.equal(classifyGame('NBA China Game', 1), 'preseason');
  assert.equal(classifyGame('West Finals - Game 2', 3), 'playoffs');
  assert.equal(classifyGame('NBA Finals - Game 4', 3), 'playoffs');
  assert.equal(classifyGame('NBA Play-In - East - 9th Place vs 10th Place', 5), 'playin');
  assert.equal(classifyGame('NBA Cup - Group Play', 2), 'cup-group');
  assert.equal(classifyGame('NBA Cup Championship', 2), 'cup-knockout'); // a regular-season type, but the Cup is where it matters
  assert.equal(classifyGame('NBA Cup - Semifinals', 2), 'cup-knockout');
  assert.equal(classifyGame('NBA All-Star - Round Robin', 2), 'allstar'); // not in the standings, whatever its season type
  assert.equal(classifyGame('NBA Rising Stars', 2), 'allstar');
});

test('series line: ESPN\'s playoff series text is shortened', async () => {
  const { seriesLine } = await import('../src/lib/espn/common.ts');
  assert.equal(seriesLine('ORL leads series 3-2'), 'ORL leads 3-2');
  assert.equal(seriesLine('NYK wins series 4-2'), 'NYK won 4-2');
  assert.equal(seriesLine('Series tied 3-3'), 'Tied 3-3');
  assert.equal(seriesLine(''), undefined);
  assert.equal(seriesLine(undefined), undefined);
});

test('player search: only NBA rows with a photo, retired players included, other sports, repeats and photoless players dropped', () => {
  const row = (uid: string, displayName: string, subtitle: string | null, photo = true) => ({
    type: 'player',
    uid,
    displayName,
    subtitle,
    ...(photo ? { image: { default: `https://a.espncdn.com/i/headshots/nba/players/full/${uid.split('a:')[1]}.png` } } : {}),
  });
  const found = normalizePlayerSearch({
    results: [
      { type: 'article', contents: [{ uid: 's:40~l:46~a:1', displayName: 'Not a player' }] },
      {
        type: 'player',
        contents: [
          row('s:40~l:46~a:261', 'Kevin Garnett', 'Minnesota Timberwolves'),
          row('s:40~l:54~a:4705491', 'Elli Garnett', 'Ohio Bobcats'),
          row('s:20~l:23~a:5218443', 'Chase Garnett', 'South Florida Bulls'),
          row('s:1100~a:2283', 'Brice Garnett', null),
          row('s:40~l:46~a:4986', 'William Garnett', null, false),
          row('s:40~l:46~a:2562', 'Marlon Garnett', 'Boston Celtics', false),
          row('s:40~l:46~a:261', 'Kevin Garnett', 'Minnesota Timberwolves'),
        ],
      },
    ],
  });
  assert.deepEqual(
    found.map((p) => [p.id, p.name, p.teamName]),
    [['261', 'Kevin Garnett', 'Minnesota Timberwolves']],
  );
  assert.match(found[0].headshot, /players\/full\/261\.png$/);
  assert.deepEqual(normalizePlayerSearch({}), []);
});

test("Game Score: Hollinger's formula over a box score line", () => {
  // A real line: 22 pts on 8-16 FG and 4-5 FT, 5 reb (all defensive), 5 ast, 3 TO, 1 stl, 0 blk, 1 PF.
  const line = { MIN: '33', PTS: '22', FG: '8-16', '3PT': '2-5', FT: '4-5', REB: '5', AST: '5', TO: '3', STL: '1', BLK: '0', OREB: '0', DREB: '5', PF: '1' };
  assert.ok(Math.abs(gameScore(line)! - 16.2) < 1e-9);
  assert.equal(formatGameScore(gameScore(line)), '16.2');
  // Offensive rebounds count for more than defensive ones, blocks and assists for 0.7, a bad shooting night goes negative.
  assert.ok(Math.abs(gameScore({ ...line, OREB: '2', DREB: '3' })! - (16.2 + 1.4 - 0.6)) < 1e-9);
  assert.ok(gameScore({ PTS: '2', FG: '1-12', FT: '0-0', TO: '4', PF: '5' })! < 0);
  // Someone who did not play has no line, so no score.
  assert.equal(gameScore({}), undefined);
  assert.equal(formatGameScore(undefined), '–');
});

test('Game Score: every player who played in the fixture has one, and the best game is a big scorer', () => {
  const played = [...home.starters, ...home.bench, ...away.starters, ...away.bench].filter((p) => !p.didNotPlay);
  const scores = played.map((p) => ({ p, score: gameScore(p.stats) }));
  assert.ok(scores.every((s) => s.score !== undefined && Number.isFinite(s.score)));
  const best = scores.reduce((a, b) => (b.score! > a.score! ? b : a));
  assert.ok(best.score! > 20);
  assert.ok(Number(best.p.stats.PTS) >= 20);
});

test('rating: Game Score on a 1-10 scale, 5 already a bad game, 7 a typical one, 8 very good, 10 a monster', () => {
  assert.equal(ratingOf(-50), 1);
  assert.equal(ratingOf(0), 5);
  assert.equal(ratingOf(10), 7);
  assert.equal(ratingOf(16), 8);
  assert.equal(ratingOf(25), 9);
  assert.equal(ratingOf(38), 10);
  assert.equal(ratingOf(60), 10);
  // Straight lines between the points, and never a lower rating for a better game.
  assert.ok(Math.abs(ratingOf(7.5) - 6.5) < 1e-9);
  for (let s = -12; s < 45; s += 0.5) assert.ok(ratingOf(s + 0.5) >= ratingOf(s));
  // 40 points, 10 rebounds and 10 assists on good shooting is a 10 (or within a whisker of it).
  const monster = { MIN: '38', PTS: '40', FG: '15-24', FT: '8-9', OREB: '2', DREB: '8', AST: '10', STL: '2', BLK: '0', PF: '2', TO: '3' };
  assert.ok(gameRating(monster)! >= 9.7);
  // The same stats on 14-for-35 shooting are worth less.
  assert.ok(gameRating({ ...monster, FG: '14-35' })! < gameRating(monster)! - 0.5);
});

test('rating: no rating for a player who did not play or only had a few minutes, one decimal otherwise', () => {
  const line = { MIN: '33', PTS: '22', FG: '8-16', FT: '4-5', REB: '5', AST: '5', TO: '3', STL: '1', BLK: '0', OREB: '0', DREB: '5', PF: '1' };
  assert.equal(formatRating(gameRating(line)), '8.0');
  assert.equal(gameRating({ ...line, MIN: '3' }), undefined);
  assert.equal(gameRating({ ...line, MIN: '--' }), undefined);
  assert.equal(gameRating({}), undefined);
  assert.equal(formatRating(undefined), '–');
});

test('rating: in the fixture game a typical rotation player lands between 6 and 8, and the best game is 8 or more', () => {
  const rated = [...home.starters, ...home.bench, ...away.starters, ...away.bench].flatMap((p) => gameRating(p.stats) ?? []);
  assert.ok(rated.length >= 14);
  const mean = rated.reduce((a, b) => a + b, 0) / rated.length;
  assert.ok(mean >= 6 && mean <= 8, `mean ${mean}`);
  assert.ok(Math.max(...rated) >= 8);
  assert.ok(Math.min(...rated) >= 1);
});

test('positions are written out for the default box score view', () => {
  assert.equal(positionName('G'), 'Guard');
  assert.equal(positionName('F'), 'Forward');
  assert.equal(positionName('C'), 'Center');
  assert.equal(positionName('PG'), 'Point Guard');
  assert.equal(positionName('F-C'), 'Forward-Center');
  assert.equal(positionName('G-F'), 'Guard-Forward');
  assert.equal(positionName('GF'), 'Guard-Forward');
  assert.equal(positionName('NA'), 'NA');
  assert.equal(positionName(''), undefined);
  assert.equal(positionName(undefined), undefined);
});
