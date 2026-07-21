-- Let admins manage product photos (gallery/thumbnail rows, main image, size chart)
-- from the dashboard, and let them upload/replace/remove files in the public
-- "products" storage bucket. All writes are gated by public.is_admin().

create or replace function public.admin_upsert_product_media(
  p_id uuid,
  p_item_id uuid,
  p_color text,
  p_label text,
  p_url text,
  p_kind text,
  p_sort_order integer
)
returns public.product_media
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.product_media;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_item_id is null then
    raise exception 'Item id is required';
  end if;

  if p_label is null or trim(p_label) = '' then
    raise exception 'Label is required';
  end if;

  if p_url is null or trim(p_url) = '' then
    raise exception 'URL is required';
  end if;

  if coalesce(p_kind, 'gallery') not in ('gallery', 'thumbnail') then
    raise exception 'Kind must be gallery or thumbnail';
  end if;

  if p_id is null then
    insert into public.product_media (item_id, color, label, url, kind, sort_order)
    values (
      p_item_id,
      nullif(trim(coalesce(p_color, '')), ''),
      trim(p_label),
      trim(p_url),
      coalesce(p_kind, 'gallery'),
      coalesce(p_sort_order, 0)
    )
    returning * into result;
  else
    update public.product_media
    set
      item_id = p_item_id,
      color = nullif(trim(coalesce(p_color, '')), ''),
      label = trim(p_label),
      url = trim(p_url),
      kind = coalesce(p_kind, 'gallery'),
      sort_order = coalesce(p_sort_order, 0)
    where id = p_id
    returning * into result;

    if not found then
      raise exception 'Media row not found';
    end if;
  end if;

  return result;
end;
$$;

revoke all on function public.admin_upsert_product_media(uuid, uuid, text, text, text, text, integer)
  from public, anon;
grant execute on function public.admin_upsert_product_media(uuid, uuid, text, text, text, text, integer)
  to authenticated;

create or replace function public.admin_delete_product_media(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  delete from public.product_media where id = p_id;
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

revoke all on function public.admin_delete_product_media(uuid) from public, anon;
grant execute on function public.admin_delete_product_media(uuid) to authenticated;

create or replace function public.admin_update_item_media(
  p_item_id uuid,
  p_image_url text,
  p_size_chart_url text,
  p_color_order text[]
)
returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.items;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_item_id is null then
    raise exception 'Item id is required';
  end if;

  update public.items
  set
    image_url = nullif(trim(coalesce(p_image_url, '')), ''),
    size_chart_url = nullif(trim(coalesce(p_size_chart_url, '')), ''),
    color_order = case
      when p_color_order is null or array_length(p_color_order, 1) is null then null
      else p_color_order
    end
  where id = p_item_id
  returning * into result;

  if not found then
    raise exception 'Item not found';
  end if;

  return result;
end;
$$;

revoke all on function public.admin_update_item_media(uuid, text, text, text[])
  from public, anon;
grant execute on function public.admin_update_item_media(uuid, text, text, text[])
  to authenticated;

-- Storage: allow admins to manage files in the public "products" bucket.
-- Reads stay public via the bucket's public flag; these policies only cover writes.
drop policy if exists "Admins can upload product media" on storage.objects;
create policy "Admins can upload product media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "Admins can update product media" on storage.objects;
create policy "Admins can update product media"
on storage.objects
for update
to authenticated
using (bucket_id = 'products' and public.is_admin())
with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "Admins can delete product media" on storage.objects;
create policy "Admins can delete product media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'products' and public.is_admin());

notify pgrst, 'reload schema';
