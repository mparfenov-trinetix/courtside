// Usernames: 3 to 20 letters, digits or underscores, unique ignoring case. Pure; the SQL (profiles_validate) enforces the same rules.

/** Names that would pass for the app, the league or a moderator. Keep in step with profiles_validate in migrations/20261114120000_core_tables.sql. */
export const RESERVED = ['admin', 'administrator', 'root', 'system', 'support', 'moderator', 'mod', 'courtside', 'espn', 'nba', 'null', 'undefined', 'anonymous', 'deleted'];

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export type UsernameCheck = { ok: true; username: string } | { ok: false; reason: 'format' | 'reserved'; message: string };

export function validateUsername(raw: unknown): UsernameCheck {
  const username = typeof raw === 'string' ? raw.trim() : '';
  if (!USERNAME_PATTERN.test(username)) {
    return { ok: false, reason: 'format', message: 'A username is 3 to 20 letters, digits or underscores.' };
  }
  if (RESERVED.includes(username.toLowerCase())) {
    return { ok: false, reason: 'reserved', message: 'That name is reserved. Pick another.' };
  }
  return { ok: true, username };
}
