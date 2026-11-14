// join: turns an anonymous session into a player. The app calls it once, after `signInAnonymously()`, with the username the person chose and
// the shared join code a friend gave them:
//
//   supabase.functions.invoke('join', { body: { username: 'Mykola', code: 'HOOP-7K2Q' } })
//
//   200 { profile: { id, username, created_at }, created: true }      the profile was made
//   200 { profile: ..., created: false }                              already joined with this very name (idempotent: safe to call again)
//   400 invalid_username   403 wrong_code   409 username_taken   401 unauthorized   429 rate_limited
//
// Calling it again with a different username renames the player (the code is checked again). This is the only way a profile comes to exist:
// the picks table references profiles, so a phone that never joined cannot make a pick however it asks.

import { adminClient, userFromRequest } from '../_shared/admin.ts';
import { fail, json, preflight } from '../_shared/cors.ts';
import { joinCodeMatches, sha256Hex } from '../_shared/join-code.ts';
import { validateUsername } from '../_shared/username.ts';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Response | Promise<Response>): void };

/** Wrong codes allowed from one address in the window below before it is refused for a while. */
const MAX_FAILED = 10;
const WINDOW_MS = 10 * 60 * 1000;

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.');

  const admin = adminClient();
  const user = await userFromRequest(req, admin);
  if (!user) return fail(401, 'unauthorized', 'Sign in first.');

  let body: { username?: unknown; code?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'bad_request', 'Send JSON: { username, code }.');
  }

  const check = validateUsername(body.username);
  if (!check.ok) return fail(400, 'invalid_username', check.message);
  const { username } = check;

  const { data: existing } = await admin.from('profiles').select('id, username, created_at').eq('id', user.id).maybeSingle();
  // Already joined under this exact name: nothing to do, no code needed.
  if (existing && existing.username === username) return json({ profile: existing, created: false });

  // A wrong code is remembered by a salted hash of the caller's address: ten in ten minutes and the address is refused for a while.
  const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? 'unknown').split(',')[0]!.trim();
  const ipHash = await sha256Hex(`${Deno.env.get('IP_HASH_SALT') ?? ''}${ip}`);
  const { count } = await admin
    .from('join_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('at', new Date(Date.now() - WINDOW_MS).toISOString());
  if ((count ?? 0) >= MAX_FAILED) return fail(429, 'rate_limited', 'Too many wrong codes. Try again in a few minutes.');

  const { data: setting } = await admin.from('app_settings').select('value').eq('key', 'join_code_sha256').maybeSingle();
  const ok = await joinCodeMatches(body.code, Deno.env.get('JOIN_CODE'), setting?.value);
  if (!ok) {
    await admin.from('join_attempts').insert({ ip_hash: ipHash });
    return fail(403, 'wrong_code', 'That join code is not right.');
  }

  const write = existing
    ? await admin.from('profiles').update({ username }).eq('id', user.id).select('id, username, created_at').single()
    : await admin.from('profiles').insert({ id: user.id, username }).select('id, username, created_at').single();

  if (write.error) {
    // 23505: the case-insensitive unique index on username. P0001: the profiles_validate trigger.
    if (write.error.code === '23505') return fail(409, 'username_taken', 'Someone already has that username.');
    if (write.error.message.includes('invalid_username')) return fail(400, 'invalid_username', 'That username is not allowed.');
    console.error('join failed', write.error);
    return fail(500, 'server_error', 'Could not create the profile. Try again.');
  }
  return json({ profile: write.data, created: !existing });
});
