-- Store explicit email marketing consent separately from transactional order emails.

create table if not exists public.marketing_subscribers (
  email text primary key,
  user_id uuid references auth.users(id) on delete set null,
  consent_source text not null,
  consented_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unsubscribed_at timestamp with time zone
);

alter table public.marketing_subscribers enable row level security;

grant select on table public.marketing_subscribers to authenticated;

drop policy if exists "Admins can read marketing subscribers" on public.marketing_subscribers;
create policy "Admins can read marketing subscribers"
on public.marketing_subscribers
for select
to authenticated
using (public.is_admin());

create or replace function public.record_marketing_consent(
  p_email text,
  p_user_id uuid default null,
  p_source text default 'website'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_source text := left(nullif(trim(coalesce(p_source, '')), ''), 80);
  v_auth_user_id uuid := (select auth.uid());
  v_user_id uuid := null;
begin
  if v_email !~* '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' then
    raise exception 'Invalid email';
  end if;

  if p_user_id is not null
    and v_auth_user_id is not null
    and p_user_id <> v_auth_user_id
  then
    raise exception 'User does not match authenticated session';
  end if;

  if p_user_id is not null and p_user_id = v_auth_user_id then
    v_user_id := p_user_id;
  end if;

  insert into public.marketing_subscribers (
    email,
    user_id,
    consent_source,
    consented_at,
    updated_at,
    unsubscribed_at
  )
  values (
    v_email,
    v_user_id,
    coalesce(v_source, 'website'),
    now(),
    now(),
    null
  )
  on conflict (email) do update
  set
    user_id = coalesce(excluded.user_id, public.marketing_subscribers.user_id),
    consent_source = excluded.consent_source,
    consented_at = excluded.consented_at,
    updated_at = excluded.updated_at,
    unsubscribed_at = null;
end;
$$;

revoke all on function public.record_marketing_consent(text, uuid, text) from public;
grant execute on function public.record_marketing_consent(text, uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
