-- Courtside, Pick'em backend: tables, types and the triggers that keep them honest.
--
-- The model in one paragraph: every phone signs in anonymously (Supabase auth), joins with the shared code through the `join` edge function
-- (which creates the `profiles` row: a username bound to that anonymous user), and then makes `picks` on `games`. `games` is the server's own
-- copy of ESPN's schedule, filled by the `settle` function; a pick can only be made while its game is still `scheduled` and before `tip_off`,
-- and the server, not the phone, stamps `made_at` and decides every `result`. Row level security is in the next migration.

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------------------------------------------------------------------

create type public.pick_result as enum ('pending', 'win', 'loss', 'void');

-- `postponed` and `canceled` games never produce a result: their picks are voided (and come back if the game is put on again).
create type public.game_status as enum ('scheduled', 'in_progress', 'final', 'postponed', 'canceled');

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------------------------------------------------

-- Is this statement running as the server (the `service_role` key, or a security-definer function owned by postgres) and not as a phone?
-- Triggers use it to let the server write what a phone may not (a pick's result).
create or replace function public.is_service_request() returns boolean
language plpgsql stable as $$
declare
  claims jsonb;
begin
  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    claims := null;
  end;
  return coalesce(claims ->> 'role', '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin', 'service_role');
end;
$$;

-- Kinds of game that can be picked: the same list as `PICKABLE_KINDS` in src/lib/league/pickem.ts (an All-Star or preseason game is in no table).
create or replace function public.is_pickable_kind(kind text) returns boolean
language sql immutable as $$
  select kind in ('regular', 'playoffs', 'playin', 'cup-group', 'cup-knockout');
$$;

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- profiles: who is who
-- ---------------------------------------------------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

-- "Mykola" and "mykola" are the same name.
create unique index profiles_username_lower_key on public.profiles (lower(username));

-- Names that would pass for the app, the league or a moderator. Keep in step with RESERVED in functions/_shared/username.ts.
create or replace function public.profiles_validate() returns trigger
language plpgsql as $$
begin
  new.username := btrim(new.username);
  if new.username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'invalid_username' using errcode = 'P0001', hint = '3 to 20 letters, digits or underscores';
  end if;
  if lower(new.username) in ('admin', 'administrator', 'root', 'system', 'support', 'moderator', 'mod', 'courtside', 'espn', 'nba', 'null', 'undefined', 'anonymous', 'deleted') then
    raise exception 'invalid_username' using errcode = 'P0001', hint = 'reserved name';
  end if;
  return new;
end;
$$;

create trigger profiles_validate
  before insert or update of username on public.profiles
  for each row execute function public.profiles_validate();

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- games: the server's copy of ESPN's schedule
-- ---------------------------------------------------------------------------------------------------------------------------------------

create table public.games (
  -- ESPN's event id.
  id text primary key,
  tip_off timestamptz not null,
  away_id text not null,
  away_abbr text not null,
  home_id text not null,
  home_abbr text not null,
  status public.game_status not null default 'scheduled',
  -- ESPN's own wording ("Final", "Q3 4:12", "Postponed"), for display and debugging.
  status_detail text,
  away_score integer,
  home_score integer,
  winner_team_id text,
  -- 'regular' | 'preseason' | 'allstar' | 'playoffs' | 'playin' | 'cup-group' | 'cup-knockout' (GameKind in src/lib/espn/common.ts).
  kind text not null default 'regular',
  -- Set once, by `settle_game`, when the winner is known.
  settled_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint games_winner_is_a_team check (winner_team_id is null or winner_team_id in (away_id, home_id))
);

create index games_tip_off_idx on public.games (tip_off);

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- picks: your call on a game
-- ---------------------------------------------------------------------------------------------------------------------------------------

create table public.picks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  -- The team picked to win.
  team_id text not null,
  -- Who was favored when the pick was made (ESPN's win chance, else the book's price): the phone knows it, the server cannot check it.
  favorite_id text,
  -- Stamped by the server on every write; a value sent by the phone is ignored.
  made_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Only the server writes it (`settle_game` / `void_game`).
  result public.pick_result not null default 'pending',
  primary key (user_id, game_id)
);

create index picks_game_idx on public.picks (game_id);
create index picks_user_result_idx on public.picks (user_id, result);

-- What a phone may and may not do to a pick, whatever it sends:
--  * only while the game exists, is still scheduled, unsettled, pickable and before tip-off;
--  * only for one of the game's two teams (and a favorite that is one of them, or none);
--  * made_at is always now(); a new pick is always `pending`; a changed pick keeps its result; the owner and the game never change.
-- The server (service role, or the security-definer settle functions) may write anything: seeds and settlement need to.
create or replace function public.picks_guard() returns trigger
language plpgsql as $$
declare
  g public.games;
begin
  new.updated_at := now();
  if public.is_service_request() then
    return new;
  end if;

  select * into g from public.games where id = new.game_id;
  if not found then
    raise exception 'game_not_found' using errcode = 'P0001';
  end if;
  if g.status <> 'scheduled' or g.settled_at is not null or g.tip_off <= now() or not public.is_pickable_kind(g.kind) then
    raise exception 'pick_locked' using errcode = 'P0001', hint = 'the game has started, is over or cannot be picked';
  end if;
  if new.team_id not in (g.away_id, g.home_id) then
    raise exception 'invalid_team' using errcode = 'P0001';
  end if;
  if new.favorite_id is not null and new.favorite_id not in (g.away_id, g.home_id) then
    raise exception 'invalid_favorite' using errcode = 'P0001';
  end if;

  new.made_at := now();
  if tg_op = 'INSERT' then
    new.result := 'pending';
  else
    new.result := old.result;
    new.user_id := old.user_id;
    new.game_id := old.game_id;
  end if;
  return new;
end;
$$;

create trigger picks_guard
  before insert or update on public.picks
  for each row execute function public.picks_guard();

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- Server-only tables
-- ---------------------------------------------------------------------------------------------------------------------------------------

-- Settings only the server reads. `join_code_sha256`: hex SHA-256 of the normalized join code (optional: the JOIN_CODE function secret
-- works too, and is what the README sets up).
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Failed attempts to join, so a stranger guessing the code is slowed down: one row per wrong code, keyed by a salted hash of the caller's IP.
create table public.join_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  at timestamptz not null default now()
);

create index join_attempts_ip_at_idx on public.join_attempts (ip_hash, at desc);

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- config: phase 2, yearly data that used to need an app release (champions, Cup winners, All-Star days, 2K ratings, legend photos...)
-- ---------------------------------------------------------------------------------------------------------------------------------------

create table public.config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
