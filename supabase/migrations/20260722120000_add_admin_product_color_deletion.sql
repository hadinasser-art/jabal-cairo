-- Delete a complete product colorway in one admin-only transaction.
-- Historical order details remain intact; only direct references to the removed
-- inventory variants are cleared.

create or replace function public.admin_delete_product_color(
  p_item_id uuid,
  p_color text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_color text := nullif(trim(coalesce(p_color, '')), '');
  candidate_urls text[] := array[]::text[];
  removable_urls text[] := array[]::text[];
  deleted_media_count integer := 0;
  deleted_variant_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_item_id is null then
    raise exception 'Item id is required';
  end if;

  if normalized_color is null then
    raise exception 'Color is required';
  end if;

  if not exists (select 1 from public.items where id = p_item_id) then
    raise exception 'Item not found';
  end if;

  if not exists (
    select 1
    from public.product_variants
    where item_id = p_item_id and color = normalized_color
  ) and not exists (
    select 1
    from public.product_media
    where item_id = p_item_id and color = normalized_color
  ) and not exists (
    select 1
    from public.items
    where id = p_item_id
      and (
        normalized_color = any(coalesce(color, array[]::text[]))
        or normalized_color = any(coalesce(color_order, array[]::text[]))
      )
  ) then
    raise exception 'Product color not found';
  end if;

  select coalesce(array_agg(distinct source.url), array[]::text[])
  into candidate_urls
  from (
    select url
    from public.product_media
    where item_id = p_item_id and color = normalized_color

    union

    select image_url as url
    from public.product_variants
    where item_id = p_item_id and color = normalized_color
  ) as source
  where source.url is not null and trim(source.url) <> '';

  if to_regclass('public.orders') is not null then
    execute
      'update public.orders
       set variant_id = null
       where variant_id in (
         select id
         from public.product_variants
         where item_id = $1 and color = $2
       )'
      using p_item_id, normalized_color;
  end if;

  delete from public.product_media
  where item_id = p_item_id and color = normalized_color;
  get diagnostics deleted_media_count = row_count;

  delete from public.product_variants
  where item_id = p_item_id and color = normalized_color;
  get diagnostics deleted_variant_count = row_count;

  update public.items
  set
    color = nullif(array_remove(coalesce(color, array[]::text[]), normalized_color), array[]::text[]),
    color_order = nullif(
      array_remove(coalesce(color_order, array[]::text[]), normalized_color),
      array[]::text[]
    )
  where id = p_item_id;

  select coalesce(array_agg(candidate.url), array[]::text[])
  into removable_urls
  from unnest(candidate_urls) as candidate(url)
  where not exists (select 1 from public.product_media where url = candidate.url)
    and not exists (select 1 from public.product_variants where image_url = candidate.url)
    and not exists (
      select 1
      from public.items
      where image_url = candidate.url or size_chart_url = candidate.url
    );

  return jsonb_build_object(
    'deleted_media_count', deleted_media_count,
    'deleted_variant_count', deleted_variant_count,
    'storage_urls', removable_urls
  );
end;
$$;

revoke all on function public.admin_delete_product_color(uuid, text)
  from public, anon;
grant execute on function public.admin_delete_product_color(uuid, text)
  to authenticated;

notify pgrst, 'reload schema';
