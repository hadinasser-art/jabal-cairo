create or replace function public.increment_offer_uses(offer_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.offers
  set uses_count = coalesce(uses_count, 0) + 1
  where id = any(offer_ids);
$$;

revoke all on function public.increment_offer_uses(uuid[]) from public;
grant execute on function public.increment_offer_uses(uuid[]) to anon, authenticated;
