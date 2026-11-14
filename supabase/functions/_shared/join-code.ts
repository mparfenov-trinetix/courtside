// The shared join code and the small crypto around it. Pure Web Crypto (available in Deno and Node), so it is testable.

/** "hoop-7k2q ", "HOOP-7K2Q" and "Hoop-7K2Q" are the same code. */
export const normalizeJoinCode = (raw: unknown): string => (typeof raw === 'string' ? raw.trim().toUpperCase() : '');

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compares two strings without stopping at the first difference (so the time taken does not say how much of a guess was right). */
export function timingSafeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/**
 * Is `attempt` the join code? `secret` is the JOIN_CODE function secret (plain), `storedHash` the optional `join_code_sha256` setting
 * (hex SHA-256 of the normalized code). Either may be missing; with neither, nobody can join (closed by default).
 */
export async function joinCodeMatches(attempt: unknown, secret: string | undefined, storedHash: string | undefined): Promise<boolean> {
  const code = normalizeJoinCode(attempt);
  if (!code) return false;
  const hash = await sha256Hex(code);
  let ok = false;
  if (storedHash) ok = timingSafeEqual(hash, storedHash.trim().toLowerCase()) || ok;
  if (secret) ok = timingSafeEqual(hash, await sha256Hex(normalizeJoinCode(secret))) || ok;
  return ok;
}
