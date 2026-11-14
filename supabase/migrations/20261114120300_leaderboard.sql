-- The leaderboard: one row per profile, computed the way the app's score card is (`summarizePicks` in src/lib/league/pickem.ts), over the
-- picks that have a result. Voided picks (postponed or canceled games) and pending picks do not count towards anything but `pending`.
--
-- Field by field, against PickSummary:
--   wins, losses      won / lost                                   (settled picks that were right / wrong)
--   pending           pending                                      (picks still waiting for a result)
--   accuracy          accuracy                                     wins / (wins + losses), 0..1; null before the first result
--   streak_kind/len   streak                                       the run you are on: 'W' or 'L' and its length; null before the first result
--   best_streak       bestStreak                                   the longest run of right calls
--   versus_games      versus.games                                 settled picks that had a favorite
--   versus_you        versus.you                                   ... of which you were right
--   versus_favorite   versus.favorite                              ... of which the favorite won (how always taking the favorite would have done)
--   upsets            upsets                                       right calls on an underdog (a favorite was known and you took the other team)
--
-- Order of picks for the streaks: by the game's tip-off, then by game id. (The app sorts by start time only, so two games that tip off at
-- the same minute are in whatever order they were stored; the id makes the server's answer the same every time.)
--
-- Ranking (documented tie-breaks):
--   1. most wins            2. best accuracy (so, with equal wins, fewer losses)
--   Players equal on both share a rank (1, 2, 2, 4: `rank()`), and are listed best streak first, then by username.
--   A player with no settled pick yet is listed last, with a null accuracy.

create or replace function public.leaderboard()
returns table (
  rank integer,
  user_id uuid,
  username text,
  wins integer,
  losses integer,
  pending integer,
  accuracy double precision,
  streak_kind text,
  streak_length integer,
  best_streak integer,
  versus_games integer,
  versus_you integer,
  versus_favorite integer,
  upsets integer
)
language sql stable security definer set search_path = public as $$
  with settled as (
    select p.user_id,
           p.game_id,
           g.tip_off,
           p.team_id,
           p.favorite_id,
           g.winner_team_id,
           (p.result = 'win') as win
      from public.picks p
      join public.games g on g.id = p.game_id
     where p.result in ('win', 'loss')
  ),
  -- rn: position in the user's history; rn_same: position among results of the same kind. rn - rn_same is constant along a run of the same kind.
  ordered as (
    select s.*,
           row_number() over (partition by s.user_id order by s.tip_off, s.game_id) as rn,
           row_number() over (partition by s.user_id, s.win order by s.tip_off, s.game_id) as rn_same
      from settled s
  ),
  runs as (
    select o.user_id, o.win, (o.rn - o.rn_same) as run_id, count(*)::integer as len, max(o.rn) as last_rn
      from ordered o
     group by o.user_id, o.win, (o.rn - o.rn_same)
  ),
  last_run as (
    select distinct on (r.user_id) r.user_id, r.win, r.len
      from runs r
     order by r.user_id, r.last_rn desc
  ),
  best as (
    select r.user_id, max(r.len) as best_len
      from runs r
     where r.win
     group by r.user_id
  ),
  agg as (
    select s.user_id,
           count(*) filter (where s.win)::integer as wins,
           count(*) filter (where not s.win)::integer as losses,
           count(*) filter (where s.favorite_id is not null)::integer as versus_games,
           count(*) filter (where s.favorite_id is not null and s.win)::integer as versus_you,
           count(*) filter (where s.favorite_id is not null and s.winner_team_id = s.favorite_id)::integer as versus_favorite,
           count(*) filter (where s.favorite_id is not null and s.win and s.team_id <> s.favorite_id)::integer as upsets
      from settled s
     group by s.user_id
  ),
  waiting as (
    select p.user_id, count(*)::integer as n
      from public.picks p
     where p.result = 'pending'
     group by p.user_id
  ),
  board as (
    select pr.id as user_id,
           pr.username,
           coalesce(a.wins, 0) as wins,
           coalesce(a.losses, 0) as losses,
           coalesce(w.n, 0) as pending,
           case when coalesce(a.wins, 0) + coalesce(a.losses, 0) = 0 then null
                else a.wins::double precision / (a.wins + a.losses) end as accuracy,
           case when lr.user_id is null then null when lr.win then 'W' else 'L' end as streak_kind,
           lr.len as streak_length,
           coalesce(b.best_len, 0) as best_streak,
           coalesce(a.versus_games, 0) as versus_games,
           coalesce(a.versus_you, 0) as versus_you,
           coalesce(a.versus_favorite, 0) as versus_favorite,
           coalesce(a.upsets, 0) as upsets
      from public.profiles pr
      left join agg a on a.user_id = pr.id
      left join waiting w on w.user_id = pr.id
      left join last_run lr on lr.user_id = pr.id
      left join best b on b.user_id = pr.id
  )
  select (rank() over (order by r.wins desc, r.accuracy desc nulls last))::integer as rank,
         r.user_id, r.username, r.wins, r.losses, r.pending, r.accuracy,
         r.streak_kind, r.streak_length, r.best_streak,
         r.versus_games, r.versus_you, r.versus_favorite, r.upsets
    from board r
   order by 1, r.best_streak desc, lower(r.username);
$$;

revoke all on function public.leaderboard() from public, anon;
grant execute on function public.leaderboard() to authenticated;

-- Who picked what on one game, for the game page: the picks of everyone who made one, once the game has started (before tip-off it returns
-- only your own, because the picks policy hides the others). A plain view of picks joined to profiles, so row level security applies.
create or replace view public.game_picks with (security_invoker = true) as
  select p.game_id, p.user_id, pr.username, p.team_id, p.result, p.made_at
    from public.picks p
    join public.profiles pr on pr.id = p.user_id;

revoke all on public.game_picks from anon, authenticated;
grant select on public.game_picks to authenticated;
