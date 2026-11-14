-- ============================================================================================================================================
-- LOCAL DEVELOPMENT ONLY. Never run this against a hosted project: it inserts fake auth users straight into auth.users.
-- `supabase db reset` runs it locally (config.toml, [db.seed]); `supabase db push` never does.
--
-- Three fake players, five games and their picks, enough to see a leaderboard with a streak, an upset and a voided pick:
--   g1  final        BOS 110 - 99 BKN     winner BOS
--   g2  final        NYK 101 - 108 IND    winner IND   (an upset: NYK were favored)
--   g3  final        GSW 120 - 115 LAC    winner GSW   (an upset: LAC were favored)
--   g4  scheduled    tips off in 6 hours  (open: picks can be made)
--   g5  postponed    its picks are void
-- ============================================================================================================================================

insert into auth.users (id, instance_id, aud, role, is_anonymous, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, username) values
  ('00000000-0000-0000-0000-0000000000a1', 'alice_seed'),
  ('00000000-0000-0000-0000-0000000000b2', 'bob_seed'),
  ('00000000-0000-0000-0000-0000000000c3', 'carol_seed')
on conflict (id) do nothing;

insert into public.games (id, tip_off, away_id, away_abbr, home_id, home_abbr, status, status_detail, away_score, home_score, winner_team_id, kind, settled_at) values
  ('seed-g1', now() - interval '3 days', '2', 'BOS', '17', 'BKN', 'final', 'Final', 110, 99, '2', 'regular', now() - interval '3 days' + interval '3 hours'),
  ('seed-g2', now() - interval '2 days', '18', 'NYK', '11', 'IND', 'final', 'Final', 101, 108, '11', 'regular', now() - interval '2 days' + interval '3 hours'),
  ('seed-g3', now() - interval '1 day', '9', 'GSW', '12', 'LAC', 'final', 'Final', 120, 115, '9', 'regular', now() - interval '1 day' + interval '3 hours'),
  ('seed-g4', now() + interval '6 hours', '7', 'DEN', '16', 'MIN', 'scheduled', 'Scheduled', null, null, null, 'regular', null),
  ('seed-g5', now() + interval '1 day', '13', 'LAL', '25', 'OKC', 'postponed', 'Postponed', null, null, null, 'regular', null)
on conflict (id) do nothing;

-- Picks (run as the database owner, so the picks_guard trigger lets the seed set `result` and `made_at`).
insert into public.picks (user_id, game_id, team_id, favorite_id, made_at, result) values
  -- alice: right, wrong (backed the favorite who lost), right on an underdog -> best run 1, now on a 1-win streak, one upset
  ('00000000-0000-0000-0000-0000000000a1', 'seed-g1', '2', '2', now() - interval '3 days' - interval '2 hours', 'win'),
  ('00000000-0000-0000-0000-0000000000a1', 'seed-g2', '18', '18', now() - interval '2 days' - interval '2 hours', 'loss'),
  ('00000000-0000-0000-0000-0000000000a1', 'seed-g3', '9', '12', now() - interval '1 day' - interval '2 hours', 'win'),
  -- bob: wrong, right on an underdog, right -> 2 wins in a row, one upset
  ('00000000-0000-0000-0000-0000000000b2', 'seed-g1', '17', '2', now() - interval '3 days' - interval '2 hours', 'loss'),
  ('00000000-0000-0000-0000-0000000000b2', 'seed-g2', '11', '18', now() - interval '2 days' - interval '2 hours', 'win'),
  ('00000000-0000-0000-0000-0000000000b2', 'seed-g3', '9', '9', now() - interval '1 day' - interval '2 hours', 'win'),
  -- carol: right, right, wrong -> best run 2, now on a loss; and a pick waiting on g4, and a void one on the postponed g5
  ('00000000-0000-0000-0000-0000000000c3', 'seed-g1', '2', '2', now() - interval '3 days' - interval '2 hours', 'win'),
  ('00000000-0000-0000-0000-0000000000c3', 'seed-g2', '11', null, now() - interval '2 days' - interval '2 hours', 'win'),
  ('00000000-0000-0000-0000-0000000000c3', 'seed-g3', '12', '12', now() - interval '1 day' - interval '2 hours', 'loss'),
  ('00000000-0000-0000-0000-0000000000c3', 'seed-g4', '7', '7', now(), 'pending'),
  ('00000000-0000-0000-0000-0000000000c3', 'seed-g5', '25', '25', now(), 'void')
on conflict (user_id, game_id) do nothing;
