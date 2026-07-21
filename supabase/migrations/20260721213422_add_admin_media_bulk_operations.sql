-- Additive admin-only bulk operations for product photography. These functions
-- keep color and photo ordering changes transactional without changing existing
-- tables, policies, rows, or RPC signatures.

create function public.admin_reorder_product_media(
  p_item_id uuid,
  p_color text,
  p_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_color text := nullif(trim(coalesce(p_color, '')), '');
  group_count integer;
  matched_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_item_id is null then
    raise exception 'Item id is required';
  end if;

  if p_ids is null then
    raise exception 'Media ids are required';
  end if;

  if cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) as ids(id)) then
    raise exception 'Media ids must be unique';
  end if;

  select count(*)
  into group_count
  from public.product_media
  where item_id = p_item_id
    and color is not distinct from normalized_color;

  select count(*)
  into matched_count
  from public.product_media
  where item_id = p_item_id
    and color is not distinct from normalized_color
    and id = any(p_ids);

  if group_count <> cardinality(p_ids) or matched_count <> cardinality(p_ids) then
    raise exception 'Media ids must exactly match the selected color group';
  end if;

  update public.product_media as media
  set sort_order = ordered.ordinality::integer * 10
  from unnest(p_ids) with ordinality as ordered(id, ordinality)
  where media.id = ordered.id
    and media.item_id = p_item_id
    and media.color is not distinct from normalized_color;
end;
$$;

revoke all on function public.admin_reorder_product_media(uuid, text, uuid[])
  from public, anon;
grant execute on function public.admin_reorder_product_media(uuid, text, uuid[])
  to authenticated;

create function public.admin_reorder_product_colors(
  p_item_id uuid,
  p_color_order text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_order text[];
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_item_id is null then
    raise exception 'Item id is required';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_color_order, array[]::text[])) as colors(color)
    where trim(color) = ''
  ) then
    raise exception 'Color names cannot be empty';
  end if;

  if (
    select count(*) <> count(distinct lower(trim(color)))
    from unnest(coalesce(p_color_order, array[]::text[])) as colors(color)
  ) then
    raise exception 'Color names must be unique';
  end if;

  select array_agg(trim(color) order by ordinality)
  into normalized_order
  from unnest(coalesce(p_color_order, array[]::text[]))
    with ordinality as colors(color, ordinality);

  update public.items
  set color_order = case
    when cardinality(coalesce(normalized_order, array[]::text[])) = 0 then null
    else normalized_order
  end
  where id = p_item_id;

  if not found then
    raise exception 'Item not found';
  end if;
end;
$$;

revoke all on function public.admin_reorder_product_colors(uuid, text[])
  from public, anon;
grant execute on function public.admin_reorder_product_colors(uuid, text[])
  to authenticated;

create function public.admin_rename_product_media_color(
  p_item_id uuid,
  p_old_color text,
  p_new_color text,
  p_color_order text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  old_color text := nullif(trim(coalesce(p_old_color, '')), '');
  new_color text := nullif(trim(coalesce(p_new_color, '')), '');
  renamed_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_item_id is null then
    raise exception 'Item id is required';
  end if;

  if old_color is null or new_color is null then
    raise exception 'Old and new color names are required';
  end if;

  if exists (
    select 1
    from public.product_media
    where item_id = p_item_id
      and color <> old_color
      and lower(color) = lower(new_color)
  ) then
    raise exception 'The new color name already exists';
  end if;

  if not (new_color = any(coalesce(p_color_order, array[]::text[])))
    or old_color = any(coalesce(p_color_order, array[]::text[])) then
    raise exception 'Color order must contain the new name and omit the old name';
  end if;

  update public.product_media
  set color = new_color
  where item_id = p_item_id and color = old_color;
  get diagnostics renamed_count = row_count;

  update public.items
  set color_order = p_color_order
  where id = p_item_id;

  if not found then
    raise exception 'Item not found';
  end if;

  return renamed_count;
end;
$$;

revoke all on function public.admin_rename_product_media_color(uuid, text, text, text[])
  from public, anon;
grant execute on function public.admin_rename_product_media_color(uuid, text, text, text[])
  to authenticated;

create function public.admin_delete_product_media_group(
  p_item_id uuid,
  p_color text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_color text := nullif(trim(coalesce(p_color, '')), '');
  deleted_count integer;
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

  delete from public.product_media
  where item_id = p_item_id and color = normalized_color;
  get diagnostics deleted_count = row_count;

  update public.items
  set color_order = case
    when cardinality(array_remove(coalesce(color_order, array[]::text[]), normalized_color)) = 0
      then null
    else array_remove(color_order, normalized_color)
  end
  where id = p_item_id;

  if not found then
    raise exception 'Item not found';
  end if;

  return deleted_count;
end;
$$;

revoke all on function public.admin_delete_product_media_group(uuid, text)
  from public, anon;
grant execute on function public.admin_delete_product_media_group(uuid, text)
  to authenticated;

notify pgrst, 'reload schema';
