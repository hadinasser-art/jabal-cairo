-- Keep only the checkout RPC public. Internal helpers should not be callable via PostgREST.

revoke all on function public.generate_order_id() from public, anon, authenticated;
revoke all on function public.increment_offer_uses(uuid[]) from public, anon, authenticated;
revoke all on function public.increment_offer_uses(uuid) from public, anon, authenticated;
revoke all on function public.sync_item_from_variants() from public, anon, authenticated;

revoke all on function public.place_order(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
