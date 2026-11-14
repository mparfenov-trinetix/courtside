-- What the `settle` edge function calls once it has read ESPN. Each function is idempotent (a second call with the same arguments changes
-- nothing) and runs as the table owner, so the picks_guard trigger treats it as the server. Only the service role may execute them.

-- A finished game: record the final score and the winner, and give every pick on it its result.
-- Also repairs a game that had been voided, or whose winner ESPN corrected. Returns how many picks changed.
create or replace function public.settle_game(p_game_id text, p_winner_id text, p_away_score integer, p_home_score integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  g public.games;
  n integer;
begin
  select * into g from public.games where id = p_game_id for update;
  if not found then
    raise exception 'unknown game %', p_game_id;
  end if;
  if p_winner_id is null or p_winner_id not in (g.away_id, g.home_id) then
    raise exception 'winner % is not a team of game %', p_winner_id, p_game_id;
  end if;

  update public.games
     set status = 'final',
         winner_team_id = p_winner_id,
         away_score = coalesce(p_away_score, away_score),
         home_score = coalesce(p_home_score, home_score),
         settled_at = coalesce(settled_at, now()),
         updated_at = now()
   where id = p_game_id;

  update public.picks
     set result = (case when team_id = p_winner_id then 'win' else 'loss' end)::public.pick_result
   where game_id = p_game_id
     and result is distinct from (case when team_id = p_winner_id then 'win' else 'loss' end)::public.pick_result;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- A game that was postponed or canceled: it counts for nobody. `p_status` is 'postponed' or 'canceled'.
create or replace function public.void_game(p_game_id text, p_status text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if p_status not in ('postponed', 'canceled') then
    raise exception 'a game is voided as postponed or canceled, not %', p_status;
  end if;
  update public.games
     set status = p_status::public.game_status, winner_team_id = null, settled_at = null, updated_at = now()
   where id = p_game_id;
  if not found then
    raise exception 'unknown game %', p_game_id;
  end if;
  update public.picks set result = 'void' where game_id = p_game_id and result <> 'void';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- A postponed game that has been put on again (the `settle` upsert has already moved its tip-off and set it back to 'scheduled'): its
-- picks count again. Mirrors the app's `setPickDate`: a pick follows its game.
create or replace function public.reopen_game(p_game_id text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  update public.picks set result = 'pending'
   where game_id = p_game_id
     and result = 'void'
     and exists (select 1 from public.games g where g.id = p_game_id and g.status = 'scheduled');
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.settle_game(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.void_game(text, text) from public, anon, authenticated;
revoke all on function public.reopen_game(text) from public, anon, authenticated;
grant execute on function public.settle_game(text, text, integer, integer) to service_role;
grant execute on function public.void_game(text, text) to service_role;
grant execute on function public.reopen_game(text) to service_role;
