-- Fase 3: drain automatico da fila de envio. Requer, antes de rodar esta
-- migration, criar o secret INTERNAL_SECRET no Vault (Project Settings ->
-- Vault) com esse nome exato, e o MESMO valor configurado via
-- `supabase secrets set INTERNAL_SECRET=...` para a Edge Function
-- send-email (sao dois lugares de armazenamento diferentes - variavel de
-- ambiente da function vs. Vault do Postgres - que precisam guardar o
-- mesmo segredo). URL abaixo ja aponta para o projeto bqjzyebbhboocytigacx.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'outbox-drain',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://bqjzyebbhboocytigacx.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'INTERNAL_SECRET')
    ),
    body := jsonb_build_object('batch_size', 10)
  );
  $$
);
