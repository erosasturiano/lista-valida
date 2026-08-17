-- Fluxo proprio de redefinicao de senha, no lugar do recovery embutido do
-- Supabase Auth. Motivo: o link do GoTrue passa pelo endpoint
-- /auth/v1/verify, que (a) so aceita redirect_to presente na lista de URLs
-- permitidas do projeto e cai em silencio na Site URL quando nao bate, e
-- (b) consome o token de uso unico em qualquer GET - incluindo o de
-- scanners de e-mail, que queimavam o link antes da pessoa clicar.
--
-- Aqui o token e nosso: viaja no fragmento da URL (#token=), que nunca
-- chega a servidor nenhum, e so e consumido no POST que de fato troca a
-- senha. Mesma estrutura usada no projeto Ritmo.

create table public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users (id) on delete cascade,
  -- guarda o sha256 do token, nunca o valor em texto puro: vazamento desta
  -- tabela nao permite redefinir senha de ninguem
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_password_reset_tokens_token_hash on public.password_reset_tokens (token_hash);
create index idx_password_reset_tokens_uid on public.password_reset_tokens (uid);

-- Limite por IP: impede tanto encher a caixa de entrada de uma vitima
-- quanto varrer uma lista de e-mails para descobrir quais existem.
create table public.password_reset_rate_limits (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);

create index idx_password_reset_rate_limits_ip_created
  on public.password_reset_rate_limits (ip, created_at);

-- RLS ligado e sem nenhuma policy: nada alcanca estas tabelas pelo cliente
-- (anon ou authenticated). So a service_role, que ignora RLS, escreve aqui.
alter table public.password_reset_tokens enable row level security;
alter table public.password_reset_rate_limits enable row level security;

-- auth.users nao e exposta pelo PostgREST, entao a busca por e-mail passa
-- por esta funcao. security definer com search_path fixado, e execute
-- revogado de todo mundo menos service_role - se anon pudesse chamar,
-- viraria justamente o oraculo de enumeracao que o fluxo tenta evitar.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
revoke all on function public.find_user_id_by_email(text) from anon;
revoke all on function public.find_user_id_by_email(text) from authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;
