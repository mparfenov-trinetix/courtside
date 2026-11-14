-- Settling on a schedule: pg_cron calls the `settle` edge function through pg_net, every five minutes, and once a day it tidies up.
--
-- The project URL and the shared secret come from Supabase Vault, so nothing secret is in this file. Before the first run, once per project
-- (README, "Schedule the settle function"):
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<the same value as the SETTLE_SECRET function secret>', 'settle_secret');
--
-- Until both exist the job does nothing (it does not fail).
--
-- Cadence: every 5 minutes is plenty for a leaderboard, but results appear up to 5 minutes after the buzzer. To be quicker while games are
-- on, make it every minute (the function is cheap: four scoreboard reads and a few upserts):
--   select cron.alter_job((select jobid from cron.job where jobname = 'settle-games'), schedule => '* * * * *');
-- NBA games are mostly 00:00-05:00 UTC (7 pm-midnight Eastern); a one-minute job only between 22:00 and 06:00 UTC would be '* 22-23,0-5 * * *'.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

-- Re-running the migration must not stack jobs.
do $$
begin
  perform cron.unschedule('settle-games');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'settle-games',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/settle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'settle_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'settle_secret');
  $job$
);

do $$
begin
  perform cron.unschedule('tidy-join-attempts');
exception when others then
  null;
end;
$$;

-- Failed join attempts older than a day are of no use.
select cron.schedule(
  'tidy-join-attempts',
  '17 4 * * *',
  $job$ delete from public.join_attempts where at < now() - interval '1 day'; $job$
);
