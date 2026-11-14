// delete-account: the caller deletes themselves (Apple requires an in-app way to delete an account that was created in the app).
//
//   supabase.functions.invoke('delete-account')        (the signed-in session's JWT identifies who)
//
//   200 { deleted: true }     401 unauthorized
//
// Removes the caller's picks, their profile and their auth user. Other people's leaderboards simply lose the row; nothing else refers to a user.

import { adminClient, userFromRequest } from '../_shared/admin.ts';
import { fail, json, preflight } from '../_shared/cors.ts';

declare const Deno: { serve(handler: (req: Request) => Response | Promise<Response>): void };

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.');

  const admin = adminClient();
  const user = await userFromRequest(req, admin);
  if (!user) return fail(401, 'unauthorized', 'Sign in first.');

  // Explicit, in order, though the foreign keys cascade: picks -> profile -> auth user.
  const picks = await admin.from('picks').delete().eq('user_id', user.id);
  if (picks.error) return fail(500, 'server_error', picks.error.message);
  const profile = await admin.from('profiles').delete().eq('id', user.id);
  if (profile.error) return fail(500, 'server_error', profile.error.message);
  const auth = await admin.auth.admin.deleteUser(user.id);
  if (auth.error) return fail(500, 'server_error', auth.error.message);

  return json({ deleted: true });
});
