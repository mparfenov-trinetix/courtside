-- Row level security. The rule of thumb: the phone reads, and writes only its own picks; everything else is the server's.
--
-- Anonymous sign-ins have the `authenticated` role (a JWT with is_anonymous = true), so "signed in" below includes them. The anon key alone
-- (no sign-in) can read only `config`.

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.picks enable row level security;
alter table public.app_settings enable row level security;
alter table public.join_attempts enable row level security;
alter table public.config enable row level security;

-- Start from nothing: Supabase grants every table to anon and authenticated by default.
revoke all on public.profiles, public.games, public.picks, public.app_settings, public.join_attempts, public.config from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- Helpers the policies use
-- ---------------------------------------------------------------------------------------------------------------------------------------

-- Can a pick on this game still be made or changed? (The picks_guard trigger checks the same thing and says why not.)
create or replace function public.game_is_open(p_game_id text) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.games g
    where g.id = p_game_id
      and g.status = 'scheduled'
      and g.settled_at is null
      and g.tip_off > now()
      and public.is_pickable_kind(g.kind)
  );
$$;

-- Has the game started (so other people's picks on it may be seen)?
create or replace function public.game_has_started(p_game_id text) returns boolean
language sql stable as $$
  select exists (select 1 from public.games g where g.id = p_game_id and g.tip_off <= now());
$$;

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- profiles: everyone signed in reads usernames; nobody writes from a phone (the `join` function does, with the service role)
-- ---------------------------------------------------------------------------------------------------------------------------------------

grant select on public.profiles to authenticated;

create policy "profiles are readable by signed-in users"
  on public.profiles for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- games: read-only for phones
-- ---------------------------------------------------------------------------------------------------------------------------------------

grant select on public.games to authenticated;

create policy "games are readable by signed-in users"
  on public.games for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- picks
-- ---------------------------------------------------------------------------------------------------------------------------------------

grant select on public.picks to authenticated;
-- Column grants: a phone can send only these. made_at, updated_at and result are not in the list, so even a hand-made request cannot set them.
grant insert (user_id, game_id, team_id, favorite_id) on public.picks to authenticated;
grant update (team_id, favorite_id) on public.picks to authenticated;
grant delete on public.picks to authenticated;

-- Your own picks always; other people's only once the game has started (nobody copies a pick before tip-off).
create policy "picks: own always, others after tip-off"
  on public.picks for select to authenticated
  using (user_id = (select auth.uid()) or public.game_has_started(game_id));

-- A pick must be yours, on an open game. (A pick without a profile cannot exist: picks.user_id references profiles.)
create policy "picks: make your own on an open game"
  on public.picks for insert to authenticated
  with check (user_id = (select auth.uid()) and public.game_is_open(game_id));

create policy "picks: change your own on an open game"
  on public.picks for update to authenticated
  using (user_id = (select auth.uid()) and public.game_is_open(game_id))
  with check (user_id = (select auth.uid()) and public.game_is_open(game_id));

-- "Tap the same side again takes the pick back" (the app's toggle).
create policy "picks: take back your own on an open game"
  on public.picks for delete to authenticated
  using (user_id = (select auth.uid()) and public.game_is_open(game_id));

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- app_settings and join_attempts: no policies, no grants: only the service role (which bypasses RLS) touches them.
-- ---------------------------------------------------------------------------------------------------------------------------------------

-- ---------------------------------------------------------------------------------------------------------------------------------------
-- config: public, read-only (the app may read it before anyone has signed in)
-- ---------------------------------------------------------------------------------------------------------------------------------------

grant select on public.config to anon, authenticated;

create policy "config is readable by everyone"
  on public.config for select to anon, authenticated
  using (true);
