alter table public.offers
  add column if not exists title_ar text,
  add column if not exists description_ar text;
