-- Let the app check whether the current email is already subscribed without exposing the table.

create or replace function public.has_marketing_consent(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.marketing_subscribers ms
    where ms.email = lower(trim(coalesce(p_email, '')))
      and ms.unsubscribed_at is null
  );
$$;

revoke all on function public.has_marketing_consent(text) from public;
grant execute on function public.has_marketing_consent(text) to anon, authenticated;

notify pgrst, 'reload schema';
