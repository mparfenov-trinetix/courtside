// CORS and JSON helpers shared by the functions. (The app is native and does not need CORS; Storybook web or a dashboard might.)

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

/** An error the app can show: a stable `code` to branch on and a `message` for people. */
export function fail(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}
