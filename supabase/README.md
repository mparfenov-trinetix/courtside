# Courtside backend (Supabase): Pick'em and the leaderboard

One global leaderboard for the friends who use the app. Phones sign in anonymously, join with one shared code and a username, make picks that
the **server** stamps and locks at tip-off, and the server settles them from ESPN. Nothing here is deployed yet: this folder is the whole
backend, ready for a project that does not exist so far.

```
supabase/
  config.toml                         local-dev config (anonymous sign-ins on, function JWT settings)
  migrations/
    20261114120000_core_tables.sql    profiles, games, picks, app_settings, join_attempts, config + the triggers
    20261114120100_rls.sql            row level security and grants
    20261114120200_settlement.sql     settle_game / void_game / reopen_game (service role only)
    20261114120300_leaderboard.sql    rpc leaderboard(), view game_picks
    20261114120400_cron.sql           pg_cron: settle every 5 minutes, tidy daily
  functions/
    join/                             code + username -> profile
    settle/                           ESPN -> games, picks -> win / loss / void   (called by cron)
    delete-account/                   the caller deletes themselves
    _shared/                          cors, admin client, ESPN scoreboard, scoring, username, join code (pure modules are unit tested)
  tests/                              node:test, no Supabase needed
  seed.sql                            LOCAL ONLY fake players and games
  contract.ts                         what the app calls and the row shapes
  .env.example                        function secrets
```

## How it works

1. **Identity.** The app calls `supabase.auth.signInAnonymously()` on first launch. That user id is the player; the session lives in the
   phone's storage. (Reinstalling loses it: see "Not done".)
2. **Join.** `functions.invoke('join', { body: { username, code } })`. The function checks the shared code, then creates the `profiles` row
   with the service role. A phone cannot write `profiles` itself, and `picks.user_id` references `profiles`, so **no join, no picks**.
3. **Games.** `settle` copies ESPN's schedule (Eastern yesterday to two days ahead) into `games`. A pick can only be made on a game that is in
   that table, `scheduled`, not settled, of a pickable kind (regular season, playoffs, play-in, Cup) and before `tip_off`.
4. **Picks.** `from('picks').upsert(...)`. The server overwrites `made_at` with `now()`, forces `result = pending`, and rejects any change
   after tip-off, a team that is not in the game, or a favorite that is not in the game.
5. **Settling.** pg_cron calls `settle` every 5 minutes. For each game: final -> `settle_game` (winner from ESPN's flag, else the higher
   score; every pick becomes win or loss); postponed or canceled -> `void_game` (picks void, they count for nobody); a postponed game put on
   again -> `reopen_game` (its picks count again, as the app's `setPickDate` moves a pick with its game). Idempotent: a second run changes nothing.
6. **Leaderboard.** `rpc('leaderboard')`: record, accuracy, streaks, versus-the-favorite and upsets, the formulas of `summarizePicks` in
   `src/lib/league/pickem.ts` (the SQL carries a field-by-field comment). Ranked by most wins, then accuracy; ties share a rank (1, 2, 2, 4)
   and are listed best streak first, then by username. Voided and pending picks count for nothing but `pending`.

## Set it up (new project)

You need a Supabase account, the [Supabase CLI](https://supabase.com/docs/guides/cli) and about ten minutes.

1. **Create the project** in the dashboard (any region near your friends). Note its **project ref** (the `abcdefgh` in
   `https://abcdefgh.supabase.co`), the **database password** you set, the **anon key** and the **URL** (Project Settings > API).
2. **Turn anonymous sign-ins on**: Authentication > Providers (or Sign In / Up) > **Allow anonymous sign-ins**. Without it
   `signInAnonymously()` fails. (Email sign-up can stay off.)
3. **Link and push the schema** from the repo root:
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```
   The cron migration needs `pg_cron`, `pg_net` and Vault; hosted projects allow them (if `db push` complains, enable them under
   Database > Extensions and run it again).
4. **Set the function secrets.** Copy `supabase/.env.example` to `supabase/.env`, put in a join code, a long random `SETTLE_SECRET`
   (`openssl rand -hex 32`) and an `IP_HASH_SALT`, then:
   ```bash
   supabase secrets set --env-file supabase/.env
   ```
5. **Deploy the three functions**:
   ```bash
   supabase functions deploy join
   supabase functions deploy settle --no-verify-jwt
   supabase functions deploy delete-account
   ```
   (`settle` is called by cron with its own secret, not a user's JWT; `config.toml` says the same.)
6. **Schedule the settle function.** In the SQL editor, once, with your real values (the secret is the same `SETTLE_SECRET`):
   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
   select vault.create_secret('<SETTLE_SECRET>', 'settle_secret');
   ```
   The job `settle-games` (every 5 minutes, created by the migration) does nothing until both exist. Check it with
   `select * from cron.job_run_details order by start_time desc limit 5;` and the function's logs. To settle faster while games are on, see the
   comment at the top of `20261114120400_cron.sql`.
7. **First run by hand**, to fill `games` right away:
   ```bash
   curl -X POST https://<project-ref>.supabase.co/functions/v1/settle -H "Authorization: Bearer <SETTLE_SECRET>"
   ```
   It answers `{ days, games, settled, voided, reopened, errors }`.
8. **Give the app** the project URL and the anon key (an `EXPO_PUBLIC_` environment variable is fine: the anon key is public by design; the
   security model below is why that is safe). The anon key and URL never go in a committed file with secrets, and the service-role key goes
   nowhere but Supabase's own function environment.

### Local development

```bash
supabase start                      # Docker; prints the local URL and keys
supabase db reset                   # applies the migrations and seed.sql (fake players alice_seed, bob_seed, carol_seed)
supabase functions serve --env-file supabase/.env
curl -X POST http://127.0.0.1:54321/functions/v1/settle -H "Authorization: Bearer <SETTLE_SECRET>"
```
In the local Studio, `select * from leaderboard();` shows the seed table (bob, carol, alice: all 2 wins, 2 of 3, ranked 1; best streak orders them).
The unit tests need none of this:
```bash
node --experimental-strip-types --no-warnings --test supabase/tests/*.test.ts
```

## What the app calls

`contract.ts` has the types. In short (all after `signInAnonymously()`):

| What | Call |
| --- | --- |
| join / rename | `functions.invoke('join', { body: { username, code } })` -> `{ profile, created }` or `{ error: { code, message } }` |
| open games | `from('games').select('*').gt('tip_off', now).order('tip_off')` |
| make or change a pick | `from('picks').upsert({ user_id, game_id, team_id, favorite_id }, { onConflict: 'user_id,game_id' })` |
| take a pick back | `from('picks').delete().match({ user_id, game_id })` |
| my picks and results | `from('picks').select('*').eq('user_id', userId)` |
| the leaderboard | `rpc('leaderboard')` |
| who picked what (after tip-off) | `from('game_picks').select('*').eq('game_id', id)` |
| delete my account | `functions.invoke('delete-account')` |
| yearly config (phase 2) | `from('config').select('key, value')` (readable before sign-in) |

Errors from `join` carry a `code`: `invalid_username` 400, `unauthorized` 401, `wrong_code` 403, `username_taken` 409, `rate_limited` 429.
A failed pick write carries one of `game_not_found`, `pick_locked`, `invalid_team`, `invalid_favorite` in `error.message`.

## Security model, and where it ends

- **The anon key is public** (it is in the app). By itself it can read `config` and create anonymous users. That is the one thing it cannot
  be stopped from doing, so **profile creation is gated by the join code**: anyone can get an anonymous user, but only someone with the code
  becomes a player. A user without a profile has no picks (foreign key) and no name on the table.
- **Row level security on every table.** Profiles and games: read-only for signed-in users. Picks: you read your own, and other people's only
  after that game's tip-off; you insert, change and delete only your own and only while the game is open. `app_settings` and
  `join_attempts` have no policies at all: only the service role reaches them. Column grants mean even a hand-made request cannot send
  `made_at` or `result`, and the `picks_guard` trigger overrides them anyway.
- **The clock is the server's.** `made_at` is `now()` on every write; the lock at tip-off is `tip_off > now()` in the policy and in the trigger.
- **Results are the server's.** Only `settle_game` / `void_game` / `reopen_game` (service role) write `result`, from ESPN, never from a phone.
- **The join code** is compared in constant time; wrong codes are counted per salted IP hash (10 in 10 minutes, then 429). It is a shared
  secret among friends, not a lock against a determined attacker: change it in `JOIN_CODE` if it leaks (existing players stay).
- **The service-role key** lives only in Supabase's function environment. Never put it in the app.

Known limits, on purpose:
- A phone can lie about `favorite_id` (the favorite when the pick was made): the server cannot check what the app's win chance said. It
  only affects "vs always taking the favorite" and upsets called, never the record. (Phase 2 could store the favorite on `games`.)
- Anyone with the join code can make as many friends as they like by calling `signInAnonymously()` again: each is its own player. Fine for
  friends; it is why the code is the gate.
- Games appear in `games` only from Eastern yesterday to two days ahead, so a pick far ahead says `game_not_found`.
- Settled results come up to 5 minutes after the buzzer (the cron cadence).
- ESPN is an undocumented API. If it fails for a day, that day is retried on the next run; if its format changes, `settle` returns
  `espn_unavailable` or skips what it cannot read, and picks stay pending (nothing is ever settled on a guess).
- A postponed game voids its picks. If ESPN puts it on again under the same id they come back (`reopen_game`); under a new id they stay void.

## Deliberately not done

- **Groups.** One global table, as decided. Adding groups later means a `groups` table, `group_members` and a filtered leaderboard; picks
  are per user and game, so nothing already stored changes.
- **Sign in with Apple** (account recovery on a new phone; Apple also wants it if other third-party sign-in is offered, which it is not).
  Until then a reinstall starts a new anonymous user. `delete-account` exists because an app that creates accounts must let people delete them.
- **Push notifications** and Live Activity updates from the server (need an APNs key from a paid Apple team).
- **The client code** (`@supabase/supabase-js`, the sync in `PickemSync`, the Leaderboard tab, the join screen): `contract.ts` is the
  agreement; nothing in `src/` uses Supabase yet.
- **Phase 2 data** (champions, Cup winners, All-Star days, 2K ratings, legend photos in `config`): the table and its read policy exist and
  are empty.

## Checks that were not run

The SQL has not been run against a database and the functions have not been deployed or served (no Postgres, Docker, Deno or Supabase
project was available when this was written). What was run: the unit tests above, which cover the pure logic of every function (ESPN
normalizing, settle decisions, username and join-code rules, the leaderboard maths against the app's own `summarizePicks`). First thing to do
on a real project: `supabase db reset` locally, then `select * from leaderboard();`.
