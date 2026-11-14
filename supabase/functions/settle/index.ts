// settle: keeps `games` in step with ESPN and gives every pick its result. Called by pg_cron every few minutes (see the cron migration), with
// the shared secret:   POST /functions/v1/settle   Authorization: Bearer <SETTLE_SECRET>
//
// One run:
//   1. reads ESPN's scoreboard for Eastern yesterday .. two days ahead;
//   2. upserts those games (so picks can be made on them; the row is the server's own record of tip-off and status);
//   3. for each game decides what its picks need (`decideSettlement`): settle (final, winner known), void (postponed or canceled), reopen
//      (put on again after a postponement), or nothing; and calls the matching SQL function, which does it atomically.
// Idempotent: run twice in a row, the second run changes nothing. A day ESPN fails to answer for is skipped and reported; the next run retries.

import { adminClient } from '../_shared/admin.ts';
import { fail, json, preflight } from '../_shared/cors.ts';
import { fetchScoreboardDay, scoreboardDateKeys, type GameRow } from '../_shared/espn.ts';
import { timingSafeEqual } from '../_shared/join-code.ts';
import { decideSettlement, type GameStatus, type StoredGame } from '../_shared/scoring.ts';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Response | Promise<Response>): void };

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.');

  const secret = Deno.env.get('SETTLE_SECRET');
  if (!secret) return fail(500, 'not_configured', 'SETTLE_SECRET is not set.');
  const header = req.headers.get('Authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : (req.headers.get('x-settle-secret') ?? '');
  if (!timingSafeEqual(provided, secret)) return fail(401, 'unauthorized', 'Wrong secret.');

  const admin = adminClient();
  const keys = scoreboardDateKeys();

  // 1. ESPN, one request per day, in parallel; a failed day is reported and skipped.
  const days = await Promise.allSettled(keys.map((key) => fetchScoreboardDay(key)));
  const errors: string[] = [];
  const byId = new Map<string, GameRow>();
  days.forEach((day, i) => {
    if (day.status === 'rejected') errors.push(`${keys[i]}: ${String(day.reason)}`);
    else for (const row of day.value) byId.set(row.id, row);
  });
  if (byId.size === 0 && errors.length === keys.length) return fail(502, 'espn_unavailable', errors.join('; '));
  const rows = [...byId.values()];
  if (rows.length === 0) return json({ days: keys, games: 0, settled: 0, voided: 0, reopened: 0, errors });

  // 2. What the database knew before this run: the decision needs it, and the upsert below overwrites it.
  const { data: stored, error: readError } = await admin
    .from('games')
    .select('id, status, winner_team_id, settled_at')
    .in('id', rows.map((r) => r.id));
  if (readError) return fail(500, 'server_error', readError.message);
  const before = new Map<string, StoredGame>(
    (stored ?? []).map((g) => [g.id as string, { status: g.status as GameStatus, winnerTeamId: g.winner_team_id as string | null, settledAt: g.settled_at as string | null }]),
  );

  const decisions = rows.map((row) => ({
    row,
    decision: decideSettlement(before.get(row.id), {
      id: row.id,
      status: row.status,
      awayId: row.awayId,
      homeId: row.homeId,
      awayScore: row.awayScore,
      homeScore: row.homeScore,
      winnerId: row.winnerId,
    }),
  }));

  // 3. Upsert. The status of a game about to be settled or voided is left to the SQL function that does it (a status written first and a
  //    call that then failed would leave the game looking done with its picks untouched); every other row carries ESPN's status.
  const base = (row: GameRow) => ({
    id: row.id,
    tip_off: row.tipOff,
    away_id: row.awayId,
    away_abbr: row.awayAbbr,
    home_id: row.homeId,
    home_abbr: row.homeAbbr,
    status_detail: row.statusDetail,
    away_score: row.awayScore,
    home_score: row.homeScore,
    kind: row.kind,
    updated_at: new Date().toISOString(),
  });
  const handledBySql = (d: { decision: { kind: string } }) => d.decision.kind === 'settle' || d.decision.kind === 'void';
  const withStatus = decisions.filter((d) => !handledBySql(d)).map((d) => ({ ...base(d.row), status: d.row.status }));
  const withoutStatus = decisions.filter(handledBySql).map((d) => base(d.row));
  for (const batch of [withStatus, withoutStatus]) {
    if (batch.length === 0) continue;
    const { error } = await admin.from('games').upsert(batch, { onConflict: 'id' });
    if (error) return fail(500, 'server_error', `games upsert failed: ${error.message}`);
  }

  // 4. The picks.
  let settled = 0;
  let voided = 0;
  let reopened = 0;
  for (const { row, decision } of decisions) {
    if (decision.kind === 'none') continue;
    const call =
      decision.kind === 'settle'
        ? admin.rpc('settle_game', { p_game_id: row.id, p_winner_id: decision.winnerId, p_away_score: row.awayScore, p_home_score: row.homeScore })
        : decision.kind === 'void'
          ? admin.rpc('void_game', { p_game_id: row.id, p_status: decision.as })
          : admin.rpc('reopen_game', { p_game_id: row.id });
    const { data, error } = await call;
    if (error) {
      errors.push(`${row.id} ${decision.kind}: ${error.message}`);
      continue;
    }
    const n = typeof data === 'number' ? data : 0;
    if (decision.kind === 'settle') settled += n;
    else if (decision.kind === 'void') voided += n;
    else reopened += n;
  }

  return json({ days: keys, games: rows.length, settled, voided, reopened, errors });
});
