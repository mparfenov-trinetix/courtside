// Supabase clients for the functions (Deno). SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided to every deployed
// function by Supabase itself, and by `supabase functions serve` locally.

import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

declare const Deno: { env: { get(name: string): string | undefined } };

const url = () => Deno.env.get('SUPABASE_URL')!;

/** The service-role client: bypasses row level security. Never hand it, or anything read with it, to a caller unchecked. */
export function adminClient(): SupabaseClient {
  return createClient(url(), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** The signed-in user behind a request's `Authorization: Bearer <jwt>` (the phone's anonymous session), or null. */
export async function userFromRequest(req: Request, admin: SupabaseClient = adminClient()): Promise<User | null> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}
