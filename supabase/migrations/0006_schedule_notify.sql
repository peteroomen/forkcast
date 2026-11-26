-- Hourly reminder run. The bearer token comes from Supabase Vault (secret
-- 'forkcast_cron_secret', same value as CRON_SECRET in Vercel); until that
-- secret exists the job does nothing.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'forkcast-notify',
  '5 * * * *',
  $job$
  select net.http_get(
    url := 'https://forkcast-lime.vercel.app/api/cron/notify',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'forkcast_cron_secret')
    ),
    timeout_milliseconds := 30000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'forkcast_cron_secret');
  $job$
);
