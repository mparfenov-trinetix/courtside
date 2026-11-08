import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { DRAFT_FROM, draftSeasons, normalizeDraft, scoutingText } from '../src/lib/espn';

// Real draft records, trimmed to the picks used: 2025 (1, 2, a traded 10th and a second-round pick), 2024's first pick (from a club abroad)
// and 2005's (a record from before ESPN linked players to their NBA page).
const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/draft.json', import.meta.url), 'utf8'));
const draft = (season: number) => {
  const f = FIXTURE[String(season)];
  return normalizeDraft(season, f.rounds, f.athletes, f.colleges);
};

test('draft 2025: picks in order, the player, his size, college, rank and NBA id', () => {
  const d = draft(2025);
  assert.deepEqual(d.picks.map((p) => p.overall), [1, 2, 10, 31]);
  const first = d.picks[0];
  assert.deepEqual([first.round, first.pick, first.traded], [1, 1, false]);
  assert.equal(first.player?.name, 'Cooper Flagg');
  assert.equal(first.player?.position, 'F');
  assert.equal(first.player?.height, `6' 8"`);
  assert.equal(first.player?.college, 'Duke');
  assert.equal(first.player?.rank, 1);
  // From 2019 on the record links to the NBA player page, so his photo and page are known.
  assert.equal(first.player?.nbaId, '5041939');
  assert.match(first.player?.headshot ?? '', /5041939\.png$/);
  assert.match(first.player?.logo ?? '', /ncaa.*150\.png$/);
  assert.equal(first.teamId.length > 0, true);
});

test('draft 2025: a traded pick keeps its note, the second round starts again at pick 1', () => {
  const d = draft(2025);
  const traded = d.picks.find((p) => p.overall === 10)!;
  assert.equal(traded.traded, true);
  assert.match(traded.tradeNote ?? '', /^Traded to /);
  const second = d.picks.find((p) => p.overall === 31)!;
  assert.deepEqual([second.round, second.pick], [2, 1]);
});

test('draft: a player from a club abroad has no college but his country flag, and an old record has no NBA id', () => {
  const abroad = draft(2024).picks[0].player!;
  assert.equal(abroad.name, 'Zaccharie Risacher');
  assert.equal(abroad.college, undefined);
  assert.match(abroad.logo ?? '', /countries.*fra\.png$/);
  const old = draft(2005).picks[0].player!;
  assert.equal(old.name, 'Andrew Bogut');
  assert.equal(old.college, 'Utah');
  assert.equal(old.nbaId, undefined);
  assert.equal(old.headshot, undefined);
});

test('draft: a pick whose player is not known yet is just the slot and the team', () => {
  const rounds = { items: [{ number: 1, picks: [{ overall: 3, round: 1, pick: 3, traded: false, team: { $ref: 'http://x/seasons/2027/teams/5?lang=en' } }] }] };
  const d = normalizeDraft(2027, rounds, {}, {});
  assert.equal(d.picks[0].teamId, '5');
  assert.equal(d.picks[0].player, undefined);
});

test('scouting report: ESPN\'s HTML as plain text with the paragraphs kept', () => {
  assert.equal(scoutingText('<strong>Strengths:</strong> Fast.<br><br><strong>Weaknesses:</strong> It&#39;s a &quot;lot&quot;.'), `Strengths: Fast.\n\nWeaknesses: It's a "lot".`);
  assert.equal(scoutingText(''), undefined);
  assert.equal(scoutingText(undefined), undefined);
});

test('draft seasons: from the latest June to 2003, newest first', () => {
  assert.deepEqual(draftSeasons(new Date(2026, 10, 8)).slice(0, 2), [2026, 2025]);
  assert.equal(draftSeasons(new Date(2026, 10, 8)).at(-1), DRAFT_FROM);
  // Before the June draft the latest one is last year's.
  assert.equal(draftSeasons(new Date(2027, 1, 1))[0], 2026);
  assert.equal(draftSeasons(new Date(2027, 5, 30))[0], 2027);
});
